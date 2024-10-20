---
title: torch 源码阅读
description: Pytorch2 recap
tags: 
- LLM
- AI
- GPU
- CUDA
---

[[toc]]

## pytorch2 中打开日志

import torch
import logging
torch._logging.set_logs(all=logging.DEBUG)

## nvrtc

torch.compile 时大量的子进程占用 GPU 设备。已知单纯调用 libnvrtc 和 libnvJitLink 不会引用 GPU 设备。

```
import torch
import logging

torch._logging.set_logs(all=logging.DEBUG)

# “reduce-overhead” 模式才会用到 cuda graph
@torch.compile(mode="reduce-overhead")
def my_model(x):
    y = torch.matmul(x, x).cuda()
    # side effect breaks graph construction
    input("during capture")
    y = torch.matmul(y, x).cuda()
    return y

x = torch.randn(10, 10).cuda()

print("graph exec 1", flush=True)
y = my_model(x)

print("graph exec 2", flush=True)
y = my_model(x)

print("y", y, flush=True)

```


Pytorch 中通过宏 AT_CUDA_NVRTC_CHECK 调用 nvrtc 的代码处理错误。libnvrtc.so 库中的符号类似 libcuda.so 等是通过下面的函数动态获取的

```c++
const at::cuda::NVRTC& nvrtc() {
  return at::globalContext().getNVRTC();
}
```

CUDAHook 和 nvrtc 的具体的实现是在
`aten/src/ATen/cuda/detail/CUDAHooks.cpp`
和
`aten/src/ATen/cuda/detail/LazyNVRTC.cpp`。在 `aten/src/ATen/cuda/detail/LazyNVRTC.cpp` 中，`lazyNVRTC` 这个全局变量上除了 nvrtc 的 API，还会通过 `dlsym` 懒加载 libcuda.so 中的部分 API。 可能就是这里 dlopen 的 libcuda.so 仍占用设备。但是这里也说不通，cuInit 和 CUcontext 相关的函数不可能不先调用。


除了下面 torch.compile 相关的会调用到 nvrtc 编译 cuda 算子，aten 库中例如 `aten/src/ATen/native/cuda/jit_utils.cpp` 的 `jit_pwise_function` 也调用了 nvrtc，但是是用来做一些循环展开等算子优化的。

## torch.compile 过程中的 nvrtc 调用

被用于代码生成

torch/_dynamo/trace_rules.py 中定义了一系列指导前端的 trace rule，其中的 “torch._C._te.construct_codegen” 是定义在 torch/csrc/jit/tensorexpr/tensorexpr_init.cpp 中的 `construct_codegen -> CudaCodeGen`，`CudaCodeGen::Initialize -> CudaCodeGen::CompileToNVRTC` 可以调用到 nvrtc 进行即时编译。

将 CudaAnalysis 分析出的代树，通过 CudaPrinter、GPUMetaVarRewriter 辅助结构体交给其他辅助函数做重写，结果写入到一个 ostringstream，交给 nvrtc 编译。

被用于算子融合

prim::FusionGroup （torch/csrc/jit/runtime/register_prim_ops_fulljit.cpp） -> runFusion -> launchFusion（torch/csrc/jit/codegen/fuser/executor.cpp）  -> launch_raw
compileKernel (torch/csrc/jit/codegen/fuser/compiler.cpp) 调用了 getConstructor 拿到 registerFusionBackend 中注册到全局的 `createFusionKernel`（torch/csrc/jit/codegen/fuser/cuda/fused_kernel.cpp 或 `torch/csrc/jit/codegen/fuser/cpu/fused_kernel.cpp`） 。


## torch.compile 其他 API

### 前端 dynamo 
torch/_dynamo/eval_frame.py  中的 `_optimize()`  前端 TorchDynamo  的入口函数。

torch/_dynamo/convert_frame.py 定义了 `ConvertFrame`、 `ConvertFrameAssert` 等仿函数类，最终调用同文件内的 `_compile` 函数，将栈帧转换成 FX graph。

### 后端 inductor
torch/_inductor/compile_fx.py  中的 `compile_fx`，在 torch/_dynamo/backends/inductor.py 里面通过 `register_backend` 注册到全局的后端 fx graph 入口函数。

torch/_inductor/async_compile.py 异步编译。维护了一个进程池，例如 `triton` 后端就通过下面这个函数，向进程池提交了一个编译任务然后返回了一个 future。

```python
def triton(self, kernel_name: str, source_code: str, device_str: str = "cuda"):
        kernel = TritonCodeCache.load(kernel_name, source_code)
        return TritonFuture(
            kernel,
            self.process_pool().submit(
                _worker_compile_triton,
                kernel._reload_in_subproc,
                extra_env,
            ),
        )
```
所以能看出，多出来的那些进程，是通过这里生成的。可以通过下面的 `TORCHINDUCTOR_COMPILE_THREADS` 环境变量修改。
然后进程池是使用的 concurrent.futures.ProcessPoolExecutor，**基于 fork，所以可能 cuda 没有用到，但是 /dev/nvidia0 等 fd 也被占用了**。

torch/_inductor/codecache.py 代码编译缓存，例如 CUDACodeCache 为 cuda 代码的编译缓存。如果需要，调用 `cuda_compile_command` 函数进行编译。

### 其他
torch/_inductor/config.py 中，通过 `decide_compile_threads` 获取了 cpu 核心数。通过环境变量 `TORCHINDUCTOR_COMPILE_THREADS` 可以修改。

## cuda graph 代码

### 前端 dynamo
torch/_dynamo/backends/cudagraphs.py 中的 `CudagraphsBackend`，通过 `register_backend` 注册到全局的 cuda graph 后端入口。

### 在后端 inductor
torch/_inductor/cudagraph_trees.py
torch/_inductor/cudagraph_utils.py


## torch 日志打印
pytorch2 中，
环境变量 TORCH_LOGS="+inductor,+dynamo"
或者也可以通过 API 直接设置 torch._logging.set_logs(all=logging.DEBUG)



## c10/cuda/CUDACachingAllocator.cpp

torch 的两个显存分配器实现，PYTORCH_NO_CUDA_MEMORY_CACHING 控制版本。有一个torch 版本的新分配器依赖 NVML，平台不支持 NVML 的时候可以先用这个环境变量关了新分配器。


## torch/nn/parallel/distributed.py

完全基于集合通信库的 DP 实现 `DistributedDataParallel`（DDP），各个 rank 独自持有模型。

首先看 `DistributedDataParallel` 的构造函数。`self._module_parameters` 中存了所有未被参数过滤掉的模型参数。

初始化阶段 `self._verify_param_shape_across_processes()`、`self._sync_module_states()` 用来在不同 rank 间检查、同步 module 的初始状态，这一步会用 broadcast 集合通信，buffer 大小在代码里写死了是 250 MB。最关键的是 `self._ddp_init_helper()` 去初始化 reducer，这一步完了基本初始化就结束了，剩下的就是一些混合精度 AMP 相关的代码等，该函数的注释如下，解释得很详细了

```python
"""
DDP init helper function to manage parameters, grad hooks, logging, and SyncBatchNorm.
Initialization helper function that does the following:
(1) bucketing the parameters for reductions
(2) resetting the bucketing states
(3) registering the grad hooks
(4) Logging construction-time DDP logging data
(5) passing a handle of DDP to SyncBatchNorm Layer
"""
```

DDP 通过将参数划分到不同的桶里面，来实现梯度 reduction 和 反向传播的 overlap 优化，掩盖 reduction 耗时，桶的默认大小是 25MB，可以通过 `bucket_cap_mb` 参数控制，桶的初始化也在 `self._ddp_init_helper()` ，调用到的方法是 `torch/csrc/distributed/c10d/reducer.cpp` 里面定义的 `compute_bucket_assignment_by_size`，获取每个桶的 idx 和 size。划分好桶之后，再通过 `torch/csrc/distributed/c10d/reducer.cpp` 中实现的 `Reducer` 类型的构造函数，完成初始化。

`compute_bucket_assignment_by_size()`的逻辑是：先构造一个桶的哈希表，每个桶内可能有多个张量，哈希表的键是通过张量的数据类型和它所在的设备哈希出来的，张量数据的大小计算方式就是张量规模乘上它的数据类型的大小。当一个键对应的桶被塞满，就要将当前的桶添加到返回列表里面，然后为相应键重建一个桶。最后再把剩余的没满的桶填充到返回列表里面。这个函数的实现上有一个技巧，就是希望尽可能让返回的列表中桶的顺序按模型中张量出现的顺序排列。在没有 torch 上层代码提供提示的情况下，这个函数里面对返回列表中的每个桶里面最小的张量序号进行了排序，假设序号小的张量是优先出现在模型中的参数。回到`self._ddp_init_helper()`中，它又将 `compute_bucket_assignment_by_size()` 返回的列表翻转了一下，希望优先处理先被反向传播过程处理到的张量。

前面提到的 `torch/csrc/distributed/c10d/reducer.cpp` 中的 `Reducer`，进行 all reduce 通信的方法实际上是 `Reducer::run_comm_hook()`。它的调用链路是 `Reducer::autograd_hook()-> Reducer::mark_variable_ready() -> Reducer::mark_bucket_ready() -> Reducer::all_reduce_bucket() -> Reducer::run_comm_hook()`。`Reducer::autograd_hook()` 被注册给了 `torch::autograd::impl::grad_accumulator::add_post_hook()`，会在梯度计算完毕累加到了梯度张量后执行，而且只会在 pytorch 的 autograd 线程上执行。

> torch 的 autograd 线程在 torch/csrc/autograd/engine.cpp 的 `Engine::start_device_threads()->Engine::thread_init()` 创建。

```cpp
c10::intrusive_ptr<c10::ivalue::Future> Reducer::run_comm_hook(
    GradBucket& grad_bucket) {
  if (comm_hook_ == nullptr) {
    // `Reducer` 构造时的参数没有配置过的话，会从 `Reducer::process_group_` 构造一个 `_AllReduceBySumCommHook`，
    // 然后对每个 bucket 做 all reduce。
    return run_allreduce_hook(grad_bucket);
  } else {
    return comm_hook_->runHook(grad_bucket);
  }
}
```

初始化函数里面还有一段有趣的代码是通过 `torch._dynamo.config._get_optimize_ddp_mode()` 获取了 torch 2 中编译器前端 torchdynamo 的设置，选择启用实验性的 python reducer，而不是用默认的 cpp 实现的 reducer。去读 `torch/_dynamo/config.py` 的话就会知道，`DistributedDataParallel` 默认会对 DDP 的通信和计算做 overlap 以掩盖通信开销。但是由于 torch 2 依赖于 PEP 523，所以纯 python 实现的 reducer 更有利于 torch 做自动分析和优化。比如通常路径上 all_reduce 操作调用的是 `torch.distributed.distributed_c10d.all_reduce()`，但是 python 版的是 `torch.distributed._functional_collectives.all_reduce()` 中的实现。通过 `DistributedDataParallel._get_active_ddp_module()` 类方法可以把 DDP 对象暴露给 torchdynamo，`DistributedDataParallel._inside_ddp_forward()` 这个 contextmanager 则是在调用 `DistributedDataParallel._run_ddp_forward()` 前就禁用了 torchdynamo。

对于 `torch.distributed.distributed_c10d.all_reduce()`，它默认调用的是 `_get_default_group()` 获取的 `ProcessGroup` 上的 `all_reduce()` 接口，这实现在 `torch/csrc/distributed/c10d/ProcessGroupWrapper.cpp` 中的公共抽象 `ProcessGroupWrapper`，它继承于 `Backend` 类型。torch 支持了多种集合通信库，每个实现也都继承了 `Backend`，如 NCCL、GLOO、UCC 等。一般我们只关心 NCCL，它实现在 `torch/csrc/distributed/c10d/ProcessGroupNCCL.cpp`。

通过 `PYTORCH_DDP_USE_SIDE_STREAM` 环境变量可以新开一个 cuda steram 做 H2D 的拷贝。

## torch/utils/data/distributed.py

`DistributedSampler` 配合 `DistributedDataParallel` 使用，对输入进行分片。
实现很简单，就是在 `self.__iter__` 函数中 `indices[self.rank : self.total_size : self.num_replicas]`，对整个 `self.total_size` 长的数据，间隔 `self.num_replicas` 按 `self.rank` 选一个。`self.rank` 可以通过 `dist.get_rank` 获取。


## torch/distributed/

`DTensor` 的各种 TP 方式的实现，和与其他并行方式的集成。DTensor 本身实现在 `torch/distributed/_tensor/api.py`。

### tensor/parallel/ddp.py

`DistributedDataParallel` 中调用的 `_pre_dp_module_transform()` 的实现，便于 DDP 和 TP 结合（torch 的 TP 依赖于 DTensor）。它注册了两个更新 DTensor 的钩子，一个用于在前向传播之前将本地张量转换回 DTensor，另一个用于在前向传播之后将 DTensor 转换回张量。避免 DDP 对 DTensor 参数的特殊处理，并使 DTensor 的梯度能够传递回 DDP 的梯度桶。

```python
def _pre_dp_module_transform(module: nn.Module):
    _localize_dtensor(module, None, None)
    # Recontruct DTensor parameters from local tensors
    module.register_forward_pre_hook(_reconstruct_dtensor)
    # Convert DTensor parameters to local tensors
    module.register_forward_hook(_localize_dtensor)
```

### nn

定义了 torch 用户可以主动使用的集合通信接口 `torch.distributed.nn.functional`，主动创建位于远端进程的 module `torch.distributed.nn.RemoteModule`。

### algorithms

一些分布式下的算法实现。

如 `torch/distributed/algorithms/model_averaging/averagers.py` 定义了用户可以直接调用的对各个 rank 的参数做均值的 `PeriodicModelAverager`，可以用于主动同步模型参数、和 PostLocalSGDOptimizer 结合用于优化器等。

`torch/distributed/optim/` 实现分布式的优化器，例如 `PostLocalSGDOptimizer`、`ZeroRedundancyOptimizer`。

`torch/distributed/algorithms/_comm_hooks/default_hooks.py` 是分布式训练中默认的 hook，可以通过 `model.register_comm_hook` 注册别的 hook。如 `torch/distributed/algorithms/ddp_comm_hooks/` 下的 `allreduce_hook()`、`post_localSGD_hook()`。注册 hook 的函数是 `DistributedDataParallel.register_comm_hook()`

## torch/nn/parallel/data_parallel.py

实现了 `DataParallel`，仅持有一份模型，每次前向更新都会在不同设备间拷贝需要并行的参数，一般已不使用。

`torch.nn.parallel.replicate()` 用于在各个设备上复制模型，它主要调用了 `_broadcast_coalesced_reshape() -> comm._broadcast_coalesced()`。`broadcast_coalesced()` 是个 C 函数，实现在 `torch/csrc/cuda/comm.cpp`。具体实现在 `_broadcast_out_impl`，这里通过一个宏控制了是否使用 NCCL，否则就是直接 CUDA D2D 拷贝。

```python
static inline std::vector<Tensor>& _broadcast_out_impl(
    const Tensor& tensor,
    std::vector<Tensor>& out_tensors) {
#ifdef USE_NCCL
  std::vector<Tensor> nccl_list;
  nccl_list.reserve(out_tensors.size() + 1);
  nccl_list.emplace_back(tensor);
  for (auto& out_tensor : out_tensors) {
    nccl_list.emplace_back(out_tensor);
  }
  if (nccl::is_available(nccl_list)) {
    nccl::broadcast(nccl_list);
  } else {
#else
  {
#endif
    for (auto& out_tensor : out_tensors) {
      out_tensor.copy_(tensor, /*non_blocking=*/true);
    }
  }
  return out_tensors;
}
```

`torch.nn.parallel.parallel_apply()` 用于在不同设备上并行计算，走得就是在不同线程、不同 `torch.cuda.device()、torch.cuda.stream()` 下调用 module 的方式。


## torch.randn() 的实现

randn的具体实现方式
/aten/src/ATen/native/TensorFactories.cpp: Tensor rand() ->
/aten/src/ATen/native/Distributions.cpp: Tensor& uniform_() ->
/aten/src/ATen/native/DistributionTemplates.h: at::Tensor& uniform_impl_() ->
/aten/src/ATen/native/cuda/DistributionUniform.cu: void uniform_kernel() ->
/aten/src/ATen/native/cuda/DistributionTemplates.h: void uniform_kernel(), void uniform_and_transform()，void distribution_nullary_kernel()
void uniform_and_transform() 里面根据数据类型，通过 distribution_nullary_kernel()加载了一个遍历 Tensor 的核函数，逐项调用 curand API curand_uniform4 或 curand_uniform2_double进行填充。
动态获取 cuda API 符号
https://github.com/pytorch/pytorch/blob/main/c10/cuda/driver_api.cpp#L40
在单个单例中，搜索 cuda driver API 和 nvml API

## /aten/src/ATen/native/TensorFactories.cpp

张量的工厂类

## /aten/src/ATen/native/Convolution.cpp

卷积实现，
例如正向推理的 cudnn 实现
cudnn_convolution -> cudnn_convolution_forward -> raw_cudnn_convolution_forward_out -> raw_cudnn_convolution_forward_out_32bit -> cudnnConvolutionForward
https://github1s.com/pytorch/pytorch/blob/v2.1.0/aten/src/ATen/native/cudnn/ConvShared.cpp#L180
https://github1s.com/pytorch/pytorch/blob/v2.1.0/aten/src/ATen/native/cudnn/Conv_v7.cpp#L629
例如反向传播的实现
https://github1s.com/pytorch/pytorch/blob/v2.1.0/aten/src/ATen/native/Convolution.cpp#L1974-L1978
这里去根据后端选择对应实现，例如 cudnn_convolution_backward_stub，实现在 /aten/src/ATen/native/cudnn/ConvShared.cpp。

## /aten/src/ATen/native/cuda/CUDALoops.cuh

借助 cuda 遍历 Tensor 中的每个元素，上述工厂类中会通过 Tensor::fill_()方法调用到它，对张量进行赋值。

## /aten/src/ATen/native/native_functions.yaml

每个 native 算子有多个后端的 native 实现，该文件描述了这些变体。
例如 fft 变换，/aten/src/ATen/native/SpectralOps.cpp 中的 Tensor stft()调用了对应的 native 算子 _fft_r2c，这又对应了两类后端实现，_fft_r2c_cufft 和 _fft_r2c_mkl
- func: _fft_r2c(Tensor self, int[] dim, int normalization, bool onesided) -> Tensor
  variants: function
  dispatch:
    CPU: _fft_r2c_mkl
    CUDA: _fft_r2c_cufft
