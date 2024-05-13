---
title: cuMemFree is with implicit-synchronization 
description: Analysis on cuMemFree and PyTorch memory management
tags: 
- CUDA
- PyTorch
- GPU
---

[[toc]]

Recently I met a problem with `cuMemFree`, and finally found it is in fact [implicit-synchronization](https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#implicit-synchronization).
This is not documented in the above CUDA tutorial and [driver API](https://docs.nvidia.com/cuda/cuda-driver-api/group__CUDA__MEM.html#group__CUDA__MEM_1g89b3f154e17cc89b6eea277dbdf5c93a).
But luckily, many discussions on [StackOverflow](https://stackoverflow.com/questions/12539593/is-cudafree-asynchronous) are related to it, which helps me a lot to identity the original problem.

## Behaviour differences between CUDA and ROCm

One interesting thing is that `cuMemFree` only block on the context where the device pointer allocated. 
In contrast, since ROCm is open-source, I found that [it blocks all of contexts on the device](https://github.com/ROCm/clr/blob/933aa1d3a7bc4e4a2b4cfb2ad7e4c40df0b8ae61/hipamd/src/hip_memory.cpp#L69).

## PyTorch Allocator

The PyTorch experimental allocator implement this implicit-synchronization.
Following snippet is taken from PyTorch 2.1, and it implements the deallocation with CUDA virtual address API.

```cpp
// c10/cuda/CUDACachingAllocator.cpp
void unmapHandles(size_t begin, size_t end) {
    // note: unlike cudaFree, MemUnmap and MemRelease do
    // not appear to synchronize in all cases, so we have to wait for the
    // stream to finish before this memory is truly free.

    // cannot call c10::cuda::stream_synchronize because
    // it might grab the GIL which can lead to a deadlock
    // Locking order must be GIL -> Allocator Lock
    C10_CUDA_CHECK(cudaStreamSynchronize(stream_));
    for (auto i : c10::irange(begin, end)) {
      CUmemGenericAllocationHandle h = handles_.at(i).value();
      handles_.at(i) = c10::nullopt;
      C10_CUDA_DRIVER_CHECK(DriverAPI::get()->cuMemUnmap_(
          ptr_ + segment_size_ * i, segment_size_));
      C10_CUDA_DRIVER_CHECK(DriverAPI::get()->cuMemRelease_(h));
    }
    trimHandles();
}
```

## OOM is recoverable

I'd like to share some another insight about PyTorch allocator, too. The `CUDA_ERROR_OUT_OF_MEMORY` is a recoverable error in PyTorch. 

Refer to the [PyTorch document](https://PyTorch.org/docs/stable/notes/cuda.html#memory-management) if you are not familiar to this.

`NativeCachingAllocator` initalize a single `DeviceCachingAllocator` on each device.
`NativeCachingAllocator::allocate()` is the public memory allocation API. 
When the environment variable `PYTORCH_NO_CUDA_MEMORY_CACHING` is set to 1,
`forceUncachedAllocator` will call `cudaMalloc` directly,
or it will call `DeviceCachingAllocator::malloc` on the specific device, and allocate from the cached buffer.

```cpp
// c10/cuda/CUDACachingAllocator.cpp
class NativeCachingAllocator : public CUDAAllocator {
DataPtr allocate(size_t size) const override {
    int device = 0;
    C10_CUDA_CHECK(c10::cuda::GetDevice(&device));
    void* r = nullptr;
    if (forceUncachedAllocator()) {
        // Deliberately don't use cudaMallocMaybeCapturing here, to force an error
        // if someone tries to use forceUncachedAllocator while capturing.
        C10_CUDA_CHECK(cudaMalloc(&r, size));
        const c10::impl::PyInterpreter* interp = c10::impl::GPUTrace::get_trace();
        if (C10_UNLIKELY(interp)) {
            (*interp)->trace_gpu_memory_allocation(reinterpret_cast<uintptr_t>(r));
        }
        return {r, r, &uncached_delete, Device(DeviceType::CUDA, device)};
    }
    if (size != 0) {
        const_cast<NativeCachingAllocator*>(this)->malloc(
            &r, device, size, cuda::getCurrentCUDAStream(device));
    }
    return {r, r, &local_raw_delete, Device(DeviceType::CUDA, device)};
}

/** allocates a block which is safe to use from the provided stream */
void malloc(void** devPtr, int device, size_t size, cudaStream_t stream) {
    Block* block = device_allocator[device]->malloc(device, size, stream);
    add_allocated_block(block);
    *devPtr = (void*)block->ptr;
    const c10::impl::PyInterpreter* interp = c10::impl::GPUTrace::get_trace();
    if (C10_UNLIKELY(interp)) {
        (*interp)->trace_gpu_memory_allocation(
            reinterpret_cast<uintptr_t>(*devPtr));
    }
}
}
```

The `DeviceCachingAllocator::malloc` will try to release some memory before re-allocate.

```cpp
// c10/cuda/CUDACachingAllocator.cpp
class DeviceCachingAllocator {
  Block* malloc(int device, size_t orig_size, cudaStream_t stream) {
    // ...
    bool block_found =
        get_free_block(params)
        || (trigger_free_memory_callbacks(params) && get_free_block(params));

    // cannot find free block, try to allocate
    if (!block_found) {
      // free some blocks and re-allocate
      block_found = alloc_block(params, false, context)
          || (release_available_cached_blocks(params) &&
              alloc_block(params, false, context))
          || (C10_LIKELY(captures_underway == 0) &&
              release_cached_blocks(context) &&
              alloc_block(params, true, context));
    }

    // report OOM events
    // ...
}
```

The `DeviceCachingAllocator::alloc_block()` will be called in the following snippet. 
And if the error is `cudaErrorMemoryAllocation`，it will erase the inner error. 

```cpp
// c10/cuda/CUDACachingAllocator.cpp
class DeviceCachingAllocator {
  bool alloc_block(
      AllocParams& p,
      bool isRetry,
      const std::shared_ptr<GatheredContext>& ctx) {
    // ...
    if (set_fraction &&
        total_allocated_memory + size > allowed_memory_maximum) {
      p.err = cudaErrorMemoryAllocation;
      return false;
    } else if (
        CachingAllocatorConfig::expandable_segments() &&
        // our checkpointing logic for private pools doesn't support
        // the expandable_segments_ structure yet
        !p.pool->owner_PrivatePool) {
      p.block = try_allocate_expandable_block(
          p.device(), p.stream(), p.pool, p.size(), ctx);
      if (p.block) {
        p.err = cudaSuccess;
      } else {
        p.err = cudaErrorMemoryAllocation;
      }
      return bool(p.block);
    } else {
      p.err = cudaMallocMaybeCapturing(&ptr, size);
      if (p.err != cudaSuccess) {
        if (p.err == cudaErrorMemoryAllocation) {
          // erase the error
          (void)cudaGetLastError();
        } else {
          // errors not related to OOM, throw it
          C10_CUDA_CHECK(p.err);
        }
        return false;
      }
    }
    // ...
    return true;
  }
}
```

The experimental allocator in PyTorch is based on CUDA virtual memory API. 
By set environment variable `PYTORCH_CUDA_ALLOC_CONF=expandable_segments`,
`DeviceCachingAllocator::alloc_block()` will call the `CachingAllocatorConfig::expandable_segments()` path,
`DeviceCachingAllocator::try_allocate_expandable_block` will call the `cuMemCreate` API.
