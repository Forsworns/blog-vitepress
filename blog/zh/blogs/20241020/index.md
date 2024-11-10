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

初始化过程中主要做了两件事 `try_create_shrreg()` 和 `init_proc_slot_withlock()`。`try_create_shrreg` 就是创建、初始化上面提到的共享文件的过程。`init_proc_slot_withlock` 则是对共享内存中当前进程的 slot 做了初始化。为 `SIGUSR1` 和 `SIGUSR1` 分别注册信号处理函数 `sig_restore_stub` 和 `sig_swap_stub`，用来恢复/暂停显存分配。

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

HAMI-core 中的劫持库，会被编译成 libvgpu.so，通过挂载 ld.so.preload 文件的方式注入到容器里面做 cuda/nvml 劫持。

## cmd/vGPUmonitor/

看代码像是内部删了一些东西才开源的，好多没用到的符号……main.go 中开了两个协程分别运行 `initMetrics` 和 `watchAndFeedback`。


### metrics.go

将自定义的 vGPU 数据格式转换收集到 Promethus。

`initMetrics` 监听了 `9394` 端口，`/metrics` 会被路由到 Prometheus 服务。由 `ClusterManagerCollector` 实现 Prometheus 的 `Collector` 接口，负责采集 metrics 并注册到 Prometheus，注册时定义了 metric 的标签 zone为 `vGPU`。接口 `Collect()` 实现时候就是通过 nvml 获取了 host 侧 GPU 指标，通过 `ContainerLister.ListContainers()` 获取了每个容器的 vGPU 指标。

#### testcollector/main.go

验证 metrics.go 中的 Prometheus 数据采集。

### validation.go

`ValidateEnvVars` 检查了一下 `HOOK_PATH` 环境变量是否配置了。

### feedback.go

`watchAndFeedback` 中每五秒，通过 `pkg/monitor/nvidia.ContainerLister` 遍历一遍所有容器，记录容器配置的优先级，综合各个容器内的 `Priority`、`RecentKernel`、`UtilizationSwitch` 信息分别修改他们的配置。
这里没看懂修改这三个变量的逻辑，还得回到 HAMI-core 那边联合起来看下。看上去 `Priority` 是数值越小优先级越高。


### noderpc/noderpc.proto

定义了一个 gRPC 服务用来获取各个 POD 中的 vGPU 使用情况，`rpc GetNodeVGPU (GetNodeVGPURequest) returns (GetNodeVGPUReply) {}`。响应中的 `sharedRegionT`，也就是 HAMI-core 中存放资源切分数据的共享内存中的数据。

## pkg/monitor/

### nvidia/cudevshr.go

为 HAMI-core 中共享内存区域内的数据，定义了 v0 和 v1 两个版本的统计信息，通过统一接口 `UsageInfo`。单个容器的统计信息如下

```go
type ContainerUsage struct {
    PodUID        string
    ContainerName string
    data          []byte
    Info          UsageInfo
}
```

`ContainerUsage` 数据存储在 `ContainerLister` 类型中，`ContainerLister.ListContainers()`在上面看到过的 `vGPUmonitor` 中被用来获取容器内的统计信息。
`ContainerLister.Update()` 则是遍历各个，通过 `loadCache()` 函数获取容器的统计数据 `ContainerUsage`。如果容器内没有调用过 cuInit，那 `loadCache()` 不会统计到它。
函数`loadCache()` 实现的逻辑是，查询文件 `$HOOK_PATH/containers/$POD_NAME/.cache`（libvgpu.so 也在该目录内），然后直接 mmap 读取出来转换成符合 `UsageInfo` 接口的数据。
`

## cmd/scheduler/

节点/GPU 调度器，实现在 `pkg/scheduler/scheduler.go`。

### main.go

启动两个协程运行收集集群中的节点设备信息的 `Scheduler.RegisterFromNodeAnnotations()` 和采集上报 Prometheus metric 的 `initMetrics()`，然后默认监听 `8080` 端口，为 `pkg/scheduler/routes/route.go` 中定义的 http 服务提供扩展 k8s 调度器服务。

### metrics.go

和 vGPUmonitor 中的 `cmd/vGPUmonitor/metrics.go` 一致，不同的地方是容器内信息来自 `pkg/scheduler/scheduler.go` 中的 `Scheduler` 类型，例如这里获取 host 侧指标是通过 `Scheduler.InspectAllNodesUsage()`，每个容器的信息是通过 `podManager.GetScheduledPods()`

## pkg/scheduler

通过 `k8s.io/kube-scheduler/extender/v1` API 拓展 k8s 的调度器。k8s 调度器负责将 Pod 分配到合适的节点，而扩展调度器可以让用户自定义调度逻辑，一般都会包含过滤、打分、绑定等机制。

### routes/route.go

`cmd/scheduler/main.go` 中定义的路由为

- `/filter` 对应 `PredicateRoute`。调用 `Scheduler.Filter()`，处理 Pod 调度过滤逻辑。
- `/bind` 对应 `Bind`，调用`Scheduler.Bind()`，处理 Pod 调度绑定逻辑。
- `/webhook` 对应 `WebHookRoute`，调用 `Scheduler.NewWebHook()` 创建 webhook，在 webhook 上调用 `ServeHTTP()`。
- `/healthz` 对应 `HealthzRoute`，心跳包。

### scheduler.go

调度器类定义

```go
type Scheduler struct {
    nodeManager
    podManager
    stopCh     chan struct{}
    kubeClient kubernetes.Interface
    podLister  listerscorev1.PodLister
    nodeLister listerscorev1.NodeLister
    //Node status returned by filter
    cachedstatus map[string]*NodeUsage
    nodeNotify   chan struct{}
    //Node Overview
    overviewstatus map[string]*NodeUsage
    eventRecorder record.EventRecorder
}
```
调度器类实现了接口 `onUpdateNode()`、`onDelNode()`、`onAddNode()`，当集群中的节点变更时，会通过回调写入事件到 `Scheduler.nodeNotify`。

它也实现了`onAddPod()`、`onUpdatePod()`、`onDelPod()`，其中 `onUpdatePod()` 算是 `onAddPod（）` 的一种特殊情况。这几个回调会直接调用 `Scheduler.addPod()` 和 `Scheduler.delPod()`。

`Scheduler.RegisterFromNodeAnnotations()` 会启动一个无限循环，每隔一段时间或收到节点变更通知时，执行节点注册逻辑，直到`Scheduler.stopCh` 收到信号终止。它通过 `Scheduler.nodeLister` 获取所有节点，做一次健康检测，然后把每个正常的节点信息建模成 `util.NodeInfo` 类型，通过 `Scheduler.addNode()` 函数在调度器中存储节点。注册完毕后会调用一次 `Scheduler.getNodesUsage()` 获取所有节点/Pod 的设备和显存信息，更新到 `Scheduler.cachedstatus` 中，不过这个成员看上去还没有怎么用到，可能是之后想做缓存。

`Scheduler.Filter()` 和 `Scheduler.Bind()` 就是之前 `routes/route.go` 部分提过的调度器做设备分配和过滤的 http 接口的实现。`Scheduler.Filter()` 首先尝试清理掉当前请求相关的 Pod 以避免对节点资源统计数据造成偏差，然后通过`Scheduler.getNodesUsage()`获取当前所有的节点及其资源信息，然后通过 `Scheduler.calcScore()` 计算一遍节点的分值和对应的节点信息、节点设备信息，按分值排序后获取最优的一个可分配节点，最后调整 Pod 的 annotation，调用 `Scheduler.addPod()`记录。`Scheduler.Bind()` 的实现比较简单，就是调用 k8s 的API 获取 node 和 pod，对 node 加锁（锁实现见 `pkg/util/nodelock/nodelock.go`），然后调用 k8s 的 Bind API 去把 pod 调度到请求的节点上。

### events.go

基于 `k8s.io/client-go/tools/record` 中的 `EventRecorder`，将Pod调度过程中的绑定/过滤事件记录到 k8s事件系统中，便于后续的故障排查和状态监控。

### nodes.go

`nodeManager` 持有一个节点和设备的哈希表，可以通过 `nodeManager.addNode()` 和 `nodeManager.rmNodeDevice()` 添加、删除调度器自身维护的节点上的 GPU 设备信息。

### pods.go

`podManager` 持有一个已被调度的 Pod 的哈希表，可以通过 `podManager.addPod()` 和 `podManager.delPod()` 添加、删除调度器自身维护的 Pod 信息。

### webhook.go

k8s 允许集群中存在多个调度器。默认情况下，Pod 使用的是 kube-scheduler 调度器。通过设置 SchedulerName 字段，我们可以指定哪个调度器来调度特定的 Pod。
这个 webhook 的 `Handle()` 就是用来为合法的 Pod 选择使用 HAMI 实现的调度器进行调度。它的实现逻辑是，先检查是否 Pod 内有容器，如果有，再去看是不是特权容器，如果不是特权容器，再调用 `pkg/device/devices.go` 中定义的 `Device` 公共接口，检查容器的资源限制、annotation 等是否符合对应设备的配置规范，如果合规就修改调度器。

### score.go

实现 k8s 中调度算法的核心，打分机制。该文件内的函数之间的调用链为 `Scheduler.calcScore()->fitInDevices()->fitInCertainDevice()`，对每个节点、每个请求进行遍历，又会对请求中的每种设备需求进行检查，最后返回一个包含节点、设备（包含了针对请求的分配情况）、分值的 `policy.NodeScore` 的列表。最外层的 `Scheduler.calcScore()` 是被 `Scheduler.Filter()` 用在了调度器的节点过滤逻辑中，用来计算节点、设备的分数选择节点设备。

### node_policy.go

节点调度策略，目前实现了两个，`binpack` 和 `spread`，默认为 `binpack`，优先占满节点，可以通过 POD 级别的 annotation `hami.io/node-scheduler-policy`进行修改。

为 `NodeScoreList` 定义了 `Less` 接口，按节点的分数进行排序。根据节点上的设备使用占比、设备核心使用占比，显存使用占比，三者求和计算分数。

### policy/gpu_policy.go

GPU 调度策略，目前实现了两个，`binpack` 和 `spread`，默认为 `spread`，优先均匀分布，可以通过 POD 级别的 annotation `hami.io/gpu-scheduler-policy` 进行修改。

为 `DeviceUsageList` 定义了 `Less` 接口，按节点的分数进行排序。根据设备上的设备使用占比、设备核心使用占比，显存使用占比，三者求和计算分数，这里注意是要加上申请的额度的。


## cmd/device-plugin/nvidia

为英伟达设备实现的 [k8s Device Plugin](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)，HAMI 一开始只支持 nvidia，放在这里也算是一个实现范例，其他厂商的 DP 在别的仓库。
也相当于是 nvidia 官方的 [DP](https://github.com/NVIDIA/k8s-device-plugin) 的一个拓展。
### main.go

通过 `startPlugins()` 启动 DP 的服务，它的主要逻辑如下

```go
func startPlugins(c *cli.Context, flags []cli.Flag, restarting bool) ([]plugin.Interface, bool, error) {
    config, err := loadConfig(c, flags)
    disableResourceRenamingInConfig(config)
    devConfig, err := generateDeviceConfigFromNvidia(config, c, flags)
    // Update the configuration file with default resources.
    err = rm.AddDefaultResourcesToConfig(&devConfig)
    // Get the set of plugins.
    pluginManager, err := NewPluginManager(&devConfig)
    plugins, err := pluginManager.GetPlugins()
    // Loop through all plugins, starting them if they have any devices to serve. 
    for _, p := range plugins {
        if len(p.Devices()) == 0 {
            continue
        }
        if err := p.Start(); err != nil {
            return plugins, true, nil
        }
    }
    return plugins, false, nil
}
```

`disableResourceRenamingInConfig()` 中禁用了官方 DP 中对设备的重命名，之后会恢复回来，应该是受限于当前的 HAMI-core 的实现？

### plugin-manager.go

`NewPluginManager()` 根据配置生成一个 DP 的工厂用来构建各种依赖的 DP，后面就会看到不只有一个，例如 nvml 也需要单独的 DP 配置。

### vgpucfg.go

实现了用来解析 HAMI 自定义的参数的工具函数 `generateDeviceConfigFromNvidia()`。

## pkg/device-plugin/nvidiadevice/nvinternal

也是基于英伟达官方的 https://github.com/NVIDIA/k8s-device-plugin/blob/main/internal 中的 DP 实现进行了拓展。

### plugin

#### api.go

定义接口

```go
type Interface interface {
    Devices() rm.Devices
    Start() error
    Stop() error
}
```

#### server.go

定义了类型 `NvidiaDevicePlugin`，实现 DP 的标准服务接口

```
service DevicePlugin {
      // GetDevicePluginOptions returns options to be communicated with Device Manager.
      rpc GetDevicePluginOptions(Empty) returns (DevicePluginOptions) {}

      // ListAndWatch returns a stream of List of Devices
      // Whenever a Device state change or a Device disappears, ListAndWatch
      // returns the new list
      rpc ListAndWatch(Empty) returns (stream ListAndWatchResponse) {}

      // Allocate is called during container creation so that the Device
      // Plugin can run device specific operations and instruct Kubelet
      // of the steps to make the Device available in the container
      rpc Allocate(AllocateRequest) returns (AllocateResponse) {}

      // GetPreferredAllocation returns a preferred set of devices to allocate
      // from a list of available ones. The resulting preferred allocation is not
      // guaranteed to be the allocation ultimately performed by the
      // devicemanager. It is only designed to help the devicemanager make a more
      // informed allocation decision when possible.
      rpc GetPreferredAllocation(PreferredAllocationRequest) returns (PreferredAllocationResponse) {}

      // PreStartContainer is called, if indicated by Device Plugin during registration phase,
      // before each container start. Device plugin can run device specific operations
      // such as resetting the device before making devices available to the container.
      rpc PreStartContainer(PreStartContainerRequest) returns (PreStartContainerResponse) {}
}
```

#### register.go


#### manager

不同平台下的 DP manager。

##### api.go

定义接口

```go
type Interface interface {
    GetPlugins() ([]plugin.Interface, error)
    CreateCDISpecFile() error
}
```

##### factory.go

`manager` 类型用来初始化 nvml、cdi，解析环境是 nvml 类型还是 tegra 类型，与后面的 manager 实现、`rm` 模块有关。

`New()` 中 `manager` 被拓展成了 `nvmlmanager`（一般情况都是基于 nvml 来管理）、`tegramanager` （tegra 设备使用）和 `null`（错误情况下的 fallback） 三类 manager，他们均需要实现 `api.Interface`。

##### null.go

`null` manager 实现。

##### nvml.go

`nvmlmanager` 实现。`nvmlmanager.GetPlugins()` 接口，通过 `rm.NewNVMLResourceManagers()` 获取所有资源，对每个资源，通过 `plugin/server.go` 中 `plugin.NewNvidiaDevicePlugin()` 构建 DP。

##### tegra.go

`tegramanager` 实现。

### rm

分配、管理、监控每个资源对应的 GPU 设备。

#### rm.go

实现 `resourceManager`，负责管理 GPU 设备。定义接口 `ResourceManager`。

```go
type ResourceManager interface {
    Resource() spec.ResourceName
    Devices() Devices
    GetDevicePaths([]string) []string
    GetPreferredAllocation(available, required []string, size int) ([]string, error)
    CheckHealth(stop <-chan interface{}, unhealthy chan<- *Device) error
}
```

`NewResourceManagers()` 为每个资源创建 `ResourceManager` 接口类型，一般来说使用的是 `NewNVMLResourceManagers()` （不需要考虑 tegra 设备）。

#### allocate.go

实现了两个 GPU 分配算法，用户可以使用 `resourceManager.getPreferredAllocation()` 获取分配出的 GPU 设备。

其中一个集成了 https://github.com/NVIDIA/go-gpuallocator/ 中的 GPU 分配器，它会借助 nvml 识别拓扑关系，按预定的策略选择合适的 GPU 设备，`resourceManager.alignedAlloc()`。
另一个则是考虑了过往的分配情况，尽可能均匀地完成分配，`resourceManager.distributedAlloc()`。

#### device.go

`Device` 类包装 k8s 的 DP 中对设备的抽象，即 k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1 中的 `Device`。提供了一组公共的接口

```go
type deviceInfo interface {
    GetUUID() (string, error)
    GetPaths() ([]string, error)
    GetNumaNode() (bool, int, error)
}
```

#### device_map.go

`DeviceMap` 基于给定的 libnvml、资源名、nvidia 官方 DP 的配置，构建资源名到 HAMI `resourceManager` 中的设备抽象的映射（device.go 中的 `Device` 类型）。

#### health.go 

检查 GPU 设备的监控状态，允许通过环境变量 `DP_DISABLE_HEALTHCHECKS` 指定一些可忽略的 xid 错误。目前默认忽略下面的 xid，因为他们只表明用户应用出错了但是设备可能仍然可用。

```go
// http://docs.nvidia.com/deploy/xid-errors/index.html#topic_4
// Application errors: the GPU should still be healthy
applicationErrorXids := []uint64{
    13, // Graphics Engine Exception
    31, // GPU memory page fault
    43, // GPU stopped processing
    45, // Preemptive cleanup, due to previous errors
    68, // Video processor exception
}
```

#### nvml_devices.go

`nvmlDevice` 和 `nvmlMigDevice` 类型包装了 github.com/NVIDIA/go-nvlib/pkg/nvml 的 `Device`。同样是实现了 `deviceInfo` 接口。

#### nvml_manager.go

`nvmlResourceManager` 包装了 `resourceManager`，集成了 github.com/NVIDIA/go-nvlib/pkg/nvml 中的 nvml接口。

#### wsl.go

`wslDevice` 包装了一层 `nvmlDevice`。= = 还支持 wsl 的……

#### tegra_devices.go、tegra_manager.go

Tegra 设备只支持 `resourceManager.distributedAlloc()` 分配策略。

`tegraResourceManager` 包装了 `resourceManager`。

= = 还支持 tegra 的……

### cdi

借助官方实现 `github.com/NVIDIA/nvidia-container-toolkit/pkg/nvcdi`，为 DP 使用的 nvidia 设备创建 CDI specs

#### api.go

定义实现 CDI 的接口

```go
type Interface interface {
    CreateSpecFile() error
    QualifiedName(string, string) string
}
```

#### factory.go

CDI `Interface` 的工厂函数，如果没有检测到 nvidia 设备，就创建一个空实现，也就无法生成 CDI specs。

#### cdi.go

定义一个 `cdiHandler` 类型用于实现生成 CDI 的接口 `Interface`

```go
type cdiHandler struct {
    logger           *logrus.Logger
    nvml             nvml.Interface // github.com/NVIDIA/go-nvlib/pkg/nvml
    nvdevice         nvdevice.Interface // github.com/NVIDIA/go-nvlib/pkg/nvlib/device
    driverRoot       string
    targetDriverRoot string
    nvidiaCTKPath    string
    cdiRoot          string
    vendor           string
    deviceIDStrategy string
    enabled      bool
    gdsEnabled   bool  // GPUDirect Storage
    mofedEnabled bool // Mellanox OpenFabrics Enterprise Distribution
    cdilibs map[string]nvcdi.Interface // github.com/NVIDIA/nvidia-container-toolkit/pkg/nvcdi
}
```

### mig/mig.go

`GetMigCapabilityDevicePaths` 获取 nvidia MIG 切分模式下的设备文件。