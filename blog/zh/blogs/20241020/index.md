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

第四范式开源的通用 GPU 虚拟化组件，支持多家 GPU 产品，目前只做了切分功能，已进 CNCF。比较像之前腾讯开源的 https://github.com/tkestack/gpu-manager

# HAMi-core
https://github.com/Project-HAMi/HAMi-core
基于主线 6b2aed490910db1a33c6575ba81b1ecd96fce5f4

## src/nvml

### hook.c

做了改动的一些 NVML API，查初始化的时候构造的真实函数指针表调用过去。最重要的就是 `_nvmlDeviceGetMemoryInfo` 这个实现。

`_nvmlDeviceGetMemoryInfo` 里面

### nvml_entry.c

没有做改动直接调用下去的 NVML API。

## src/multiprocess
### multiprocess_memory_limit.c


## src/allocator/allocator.c

## src/utils.c

定义了一个跨进程的锁，`"/tmp/vgpulock/lock”`，`O_EXCL` 地互斥地打开该文件作为锁。

## include
### libnvml_hook.h

定义了宏如 NVML_OVERRIDE_CALL，和用于标识 NVML API 的枚举 NVML_OVERRIDE_ENUM_t。实现上不够简洁很多地方可以 #include 同一个 API 列表去做替换。也没看到生成这些头文件的相关脚本，后面升级更新 API 列表很麻烦。

### libcuda_hook.h

类似 libnvml_hook.h

# HAMi
https://github.com/Project-HAMi/HAMi
