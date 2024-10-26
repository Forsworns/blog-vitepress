---
title: HAMI 源码阅读
description: 第四范式开源的通用 GPU 虚拟化组件
tags: 
- GPU
- CUDA
- 虚拟化
- k8s
---

[[toc]]

第四范式开源的通用 GPU 虚拟化组件，支持多家 GPU 产品，目前只做了切分功能，已进 CNCF。比较像之前腾讯开源的 https://github.com/tkestack/gpu-manager 和对应的 https://github.com/tkestack/vcuda-controller，之前一直没仔细读，刚好读下这个进了 CNCF 的吧。

# HAMi-core
https://github.com/Project-HAMi/HAMi-core
基于主线 6b2aed490910db1a33c6575ba81b1ecd96fce5f4

## src/libvgpu.c

劫持 libcuda.so 和 libnvidia-ml.so 的方法是通过劫持 dlsym 函数，如果用户查询的某个符号是 HAMI-core 可以拦截的，就返回对应的拦截函数。dlsym 则是通过暴露一个同名符号，通过 LD_PRELOAD 等方式对 libdl 做覆盖拦截。

## src/nvml

### hook.c

做了改动的一些 NVML API，查初始化的时候构造的真实函数指针表调用过去。最重要的就是 `_nvmlDeviceGetMemoryInfo` 这个实现。

`_nvmlDeviceGetMemoryInfo` 里面 `nvmlDeviceGetIndex` 获取到设备的 id，通过 `nvml_to_cuda_map()` 转换成 `shared_region_info_t` 中用于标识虚拟设备的 id。根据 id 查询 `shared_region_info_t` 类型的全局单例 `region_info`，获取当前虚拟设备的显存限制和使用情况。

### nvml_entry.c

没有做改动直接调用下去的 NVML API。

## src/multiprocess

### shrreg_tool.c

一个命令行小工具，支持几个选项：
- create_new：创建了一个文件 `/tmp/cudevshr.cache`，后面会被用来做跨进程的共享区域，它只是保证这个文件存在。
- Suspend/resume：对所有运行中的被监控到的进程执行 `SIGUSR1` 和 `SIGUSR2` 分别用于恢复和挂起这些任务。

### multiprocess_memory_limit.c

这个文件里面比较杂，主要是 HAMI 的多进程资源使用情况的共享内存文件缓存、基于这个共享内存实现的显存管理、还有一些工具函数如host/container pid 转换、共享内存的加锁（lock_shrreg、unlock_shrreg
），虽然看文件名只是做显存限制的。vcuda-controller 里面实现的比较简单，就是在一个文件里面存了下每个进程的 pid，然后每个 API 调用都会调用 `nvmlDeviceGetComputeRunningProcesses` 去查然后去对 pid 做匹配，为了省时，搜索的时候对 pid 做了二分，总体上开销还是比较高的。HAMI 这里则是通过直接创建一个多进程共享的资源消耗统计文件，进行了缓存，减少 NVML API 调用次数。这个共享文件会被 mmap 到每个进程内，也就是 `shared_region_t` 类型的 `region_info.shared_region`。

初始化过程中主要做了两件事 `try_create_shrreg()` 和 `init_proc_slot_withlock()`。`try_create_shrreg` 就是创建、初始化上面提到的共享文件的过程。`init_proc_slot_withlock` 则是对共享内存中当前进程的 slot 做了初始化。为 `SIGUSR1` 和 `SIGUSR1` 分别注册信号处理函数 `sig_restore_stub` 和 `sig_swap_stub`。

那么有了上面的共享内存，HAMI 中就不是通过 NVML 去查询显存占用了，而是通过 `get_gpu_memory_usage` 直接查询共享内存缓存中的统计数据。那么它又是如何收集这个统计数据的呢？这就涉及到了另一个比较有趣的函数是 `add_gpu_device_memory_usage`，它在涉及到显存剧烈变化的 CUDA API 执行时被调用，用来修改共享内存中的显存消耗统计数据，同时它还支持对显存进行分类，区分了是 CUcontext 相关、CUmodule相关、数据相关三类。但是读完代码发现，其实只有通过 cuda API 分配的数据显存被准确统计到了，不知道是不是他们内部实现没有开源出来。CUmodule 实际上完全没统计，CUcontext 则是用了一下初始化后 primary context 的消耗去计算，不过除了 primary context，一般上层框架也基本没有自己去创建 CUcontext 的（其他厂商，AMD ROCm 甚至实际上没有区分 device 和 context）。


### multiprocess_utilization_watcher.c

对 cuda core 进行分配，与 vcuda-controller 中类似。

`cuda_to_nvml_map` 变量定义在这里，在别的地方 extern 引用了。全局变量 `g_cycle` 为 10ms，`g_wait` 为 120ms。

几个重要的函数，`setspec()` 用于计算 cuda core 的总数。这里的 FACTOR 是 32，没太搞懂为啥，A100 每个 SM 是 64 个 cuda core，L20、H100 GPU 每个 SM 上是 128 个 cuda core，当然也可能这里表示的是 CUDA 一个 SM 上的 wrap size 是 32。over-subscription 的话有允许调度多个线程，所以是乘起来。感觉只是一个软性的估计，下面的限流器实现其实也可以看出来是允许超过限制的。

```
int setspec() {
    CHECK_CU_RESULT(cuDeviceGetAttribute(&g_sm_num,CU_DEVICE_ATTRIBUTE_MULTIPROCESSOR_COUNT,0));
    CHECK_CU_RESULT(cuDeviceGetAttribute(&g_max_thread_per_sm,CU_DEVICE_ATTRIBUTE_MAX_THREADS_PER_MULTIPROCESSOR,0));
    g_total_cuda_cores = g_max_thread_per_sm * g_sm_num * FACTOR;
    return 0;
}
```

`rate_limiter()` 是对 utilization 做限制的核心实现（注意 nvidia-smi 看到 utilization 是一个时分的统计数据，这里从 cuda core 的角度去限制实际上是空分的），在 `cuLaunchKernel` 被调用的时候先触发它，用来限流。加载核函数的 grid 参数被用来计算需要占用的 cuda core 数量。这里在限流的时候，留了一个优先级的接口，`region_info.shared_region->priority` 目前看没啥实际用途。（NSDI 23 的一个类似的工作 https://github.com/pkusys/TGS，做了优先级调度，简单看了下代码都是同根生~）。精简后核心如下

```cpp
// 同样没有用 block，按 vcuda-controller 那边的解释，他们是认为 block 的影响没有 grid 大所以只用了 grid，所以只是留了一个参数给其他算法实现
void rate_limiter(int grids, int blocks) {
  	int before_cuda_cores = 0;
  	int after_cuda_cores = 0;
	int kernel_size = grids;
    	do {
      		before_cuda_cores = g_cur_cuda_cores;
		// cuda core 不够了，进入睡眠，每 10ms 检查一次 cuda core 资源，等待别的核函数跑完释放了 cuda core，再提交新的核函数。
      		if (before_cuda_cores < 0) {
        		nanosleep(&g_cycle, NULL);
			continue;
      		}
		// 更新如果加载了核函数，会剩余的 cuda core 数量。按这种实现，用户可以使用远超过限制的 cuda core？
      		after_cuda_cores = before_cuda_cores - kernel_size;
    	} while (!CAS(&g_cur_cuda_cores, before_cuda_cores, after_cuda_cores));
}
```

`utilization_watcher` 是一个进程内的守护线程，在 `src/libvgpu.c` 中通过 `init_utilization_watcher()` 在初始化完成后创建，以 `g_wait` 为周期重新分配 cuda core 计算资源，较 vcuda-controller 中的 cuda core 分配策略做了很大的删减，代码简化后如下，

```cpp
void* utilization_watcher() {
    int userutil[CUDA_DEVICE_MAX_COUNT];
    int sysprocnum;
    int share = 0;
    int upper_limit = get_current_device_sm_limit(0);
    while (1){
	// 120ms 更新一次分配
        nanosleep(&g_wait, NULL);
        if (pidfound==0) {
	  // 在 `region_info.shared_region->procs` 中注册自己，目前代码中写死了最多支持 1024 个进程。
          update_host_pid();
        }
	// 设置进程 sm 利用率为 0
        init_gpu_device_sm_utilization();
	// 这里实际上拿到了多卡的信息，而且和 vcuda-controller 不同的是它是会把查询结果写到一个共享文件里面做缓存。
        get_used_gpu_utilization(userutil,&sysprocnum);
        if ((share==g_total_cuda_cores) && (g_cur_cuda_cores<0)) {
	  // 这里没看懂
          g_total_cuda_cores *= 2;
          share = g_total_cuda_cores;
        }
	// 但是按这里的写法，当前是只支持了单卡，没有利用到上一步取出的多卡信息，
	// 根据利用率限制、当前的利用率、上次的变化值，计算这次分配额度的变化
        share = delta(upper_limit, userutil[0], share);
	// 应用计算出的额度变化，重新配置 `g_cur_cuda_cores`
        change_token(share);
    }
}
```

上面通过在 `get_used_gpu_utilization()` 内，调用 `nvmlDeviceGetComputeRunningProcesses` 获取所有正在使用某个 GPU 设备的进程，然后调用 `nvmlDeviceGetProcessUtilization` 获取每个进程的 GPU 利用率和显存占用，分别记录到了 `region_info.shared_region->procs[i].device_util[dev].sm_util` 和 `region_info.shared_region->procs[i].monitorused[dev]`。这个函数是考虑了多进程的。


## src/allocator/allocator.c

`allocated_list` 是一个存了 `allocated_device_memory_struct` 的双向链表，实例化了两个全局变量 `device_overallocated`、`array_list`。成员定义如下

```cpp
struct allocated_device_memory_struct{
    CUdeviceptr address;
    size_t length;
    CUcontext ctx;
    CUmemGenericAllocationHandle *allocHandle;
};
```

`region_list` 是一个存了 `region_struct` 的双向链表，实例化成了一个全局变量 ``r_list。成员定义如下

```cpp
struct region_struct{
    size_t start;
    size_t freemark;
    size_t freed_map;
    size_t length;
    CUcontext ctx;
    allocated_list *region_allocs;
    char *bitmap;
    CUmemGenericAllocationHandle *allocHandle;
};
```

OVERSIZE 128M，IPCSIZE 2M，ALIGN 也是 2M。

`oom_check()` 就是查询了上面提到的记录着进程信息的共享内存区域，获取当前设备的显存用量，加上请求分配的显存值，和设定的限制值做比较。如果超过限制，就尝试清理下已经结束的进程的显存记录，然后重新计算一遍。

剩下的接口就都是对 cuda 显存分配的一些抽象，把分配结果记录到上面创建的全局列表里面。他们底层又对应着 `add_chunk_async()`
```cpp
int allocate_raw(CUdeviceptr *dptr, size_t size);
int free_raw(CUdeviceptr dptr);
int add_chunk_only(CUdeviceptr address,size_t size);
int allocate_async_raw(CUdeviceptr *dptr, size_t size, CUstream hStream); // 基于 add_chunk_async
int free_raw_async(CUdeviceptr dptr, CUstream hStream);
```

`check_memory_type()` 就是在 `device_overallocated` 里面检查有没有查询的指针，判断是设备地址还是 host 侧地址。值得注意的是按这个实现，`cuMemAllocManaged` 分配出来的地址算到了设备地址里面。


## src/cuda/

libcuda.so 库劫持逻辑，好多 API 其实没实现劫持方案，只是打印了一下日志，感觉是之后打算做。劫持的时候注意一下 `cuGetProcAddress` 即可。

### memory.c

劫持了显存分配 API，逻辑上就是先调用 `oom_check()` 检查一下，如果超过显存限制，就不分配了直接返回 OOM。

比较特殊的是 `cuMemHostAlloc`、`cuMemAllocHost_v2`、`cuMemHostRegister_v2`，这三个 API，则是先真实触发进行分配，再调用 `oom_check()` 检查显存，如果超了，就释放掉回滚刚刚到真实分配。这个逻辑感觉很迷惑，这三个 API 的分配并没有涉及到对 `src/allocator/allocator.c` 中的全局链表的修改，也就是说分配前后实际上检查的效果是一样的，为什么要先分配再回滚呢？


## src/utils.c

定义了一个跨进程的锁，`"/tmp/vgpulock/lock”`，`try_lock_unified_lock` 通过标记 `O_EXCL` 互斥地打开该文件作为锁。

`parse_cuda_visible_env` 查看环境变量中 `CUDA_VISIBLE_DEVICES`，尝试对卡的序号进行修正，存到 `cuda_to_nvml_map` 里面。那这里实际上只支持 nvidia-container-toolkit 对应的 runc 场景，其他厂商都还需要适配。比如昇腾，他们接入 HAMI，是也拿 `CUDA_VISIBLE_DEVICES` 去做自己的 runc 配置的环境变量了么。

`mergepid` 接收两个 `nvmlDeviceGetComputeRunningProcesses` 采集到的进程组，合并到一个里面。实际上不要这个函数也行，反正现在只支持单卡，这个函数只是为了对多卡的`nvmlDeviceGetComputeRunningProcesses`  返回结果做聚合。

`getextrapid` 比较两个`nvmlDeviceGetComputeRunningProcesses` 采集到的进程组，找到新增的那一个进程。

`set_task_pid` 是为容器内 pid 和 host 侧 pid 建立关联，因为 `nvmlDeviceGetComputeRunningProcesses` 可以获取到占用 GPU 设备的 host 侧进程号。先调用一次`mergepid` 将所有占用 GPU 的进程记录到 `pre_pids_on_device`。`cuDevicePrimaryCtxRetain` 之后（看上去没激活 ctx 的话不会被 nvml 检测到？），再调用一次 `mergepid`把所有占用 GPU 的进程记录到 `pids_on_device`，然后通过`getextrapid`过滤出来一个新增的进程，就是当前进程在 host 侧的进程号，然后它通过 `set_host_pid` 把这个 hostpid 写入到 region_info 的共享内存当前进程的分区中。如果有恰好在查找过程中退出的进程，没有影响，因为我们只关心新增的进程，而别的新增进程还卡在 `try_lock_unified_lock` 那里。

## include
### libnvml_hook.h

定义了宏如 NVML_OVERRIDE_CALL，和用于标识 NVML API 的枚举 NVML_OVERRIDE_ENUM_t。实现上不够简洁很多地方可以 #include 同一个 API 列表去做替换。也没看到生成这些头文件的相关脚本，后面升级更新 API 列表很麻烦。

### libcuda_hook.h

类似 libnvml_hook.h

# HAMi
https://github.com/Project-HAMi/HAMi

