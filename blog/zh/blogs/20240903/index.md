---
title: GPU C/R 论文阅读 Just-In-Time Checkpointing Low Cost Error Recovery from Deep Learning Training Failures
description: EuroSys24 微软 GPU 新作，终于不像读到 Singularity 时那么迷茫了
tags: 
- LLM
- AI
- GPU
- CUDA
---

[[toc]]

今天读到了 EuroSys24 的微软论文《Just-In-Time Checkpointing: Low Cost Error Recovery from Deep Learning Training Failures》，做模型训练快速 checkpoint/restore 的。之前一直没看到这篇文章，有点可惜。

我博客简介里面说的 [Singularity](https://www.microsoft.com/en-us/research/publication/singularity-planet-scale-preemptive-and-elastic-scheduling-of-ai-workloads/?msockid=12fa3053da4366e502b82236db4b672f) 是 2022 年微软另一篇 GPU 虚拟化的论文 《Singularity: Planet-Scale, Preemptive and Elastic Scheduling of AI Workloads》（如果大佬您接受俺做的 CUDA 劫持算 GPU 虚拟化的话）。

最近让我感到类似 Singularity 的冲击的 GPU C/R 相关的论文有两篇：一篇是 SC23 的 workshop 文章《Checkpoint/Restart for CUDA Kernels》；另一篇是 SJTU IPADS 的 《PARALLELGPUOS: A Concurrent OS-level GPU Checkpoint and Restore System using Validated Speculation》。

闲言少叙，让我们一起走近今天这篇文章，我只会读到第四章完，也就是架构设计结束。第五章是一些数值分析，没有看了。再后面的实验章节我是日常不看的。括号内是一些个人的补充或者想法。

## 摘要

这篇文章的主要创新点在于，为大规模分布式训练，设计了一种故障后的即时（JIT）的快照恢复机制，仅需要重放少量训练中的 minibatch 即可恢复。而不是常见的：定期对参数做 checkpoint，在出错后所有节点全部回退到上一个 checkpoint。

这种 JIT 的机制，减少了故障恢复耗时，也就缩短了模型训练的周期，提升了系统资源整体的利用率。因为在生产环境下，通信、掉卡等故障实际上发生的概率很高，特别是对于现在的大规模分布式训练，集群的规模增大，故障的频率也就随之升高。定期做 checkpoint，哪怕是异步的 checkpoint，也会挤占 CPU、带宽等资源，而且这个频率要结合 MTBF、模型规模往往是经验值，难以优化。

这篇文章的第三章讲了怎么在用户的训练代码中调用他们的 JIT checkpoint 机制；第四章讲了怎么透明地应用 JIT checkpoint，从而避免修改用户代码，显得第三章内容有点鸡肋。

## 1. 引言

大模型训练耗时往往在数周到数月，GPU 节点间通过 NVLink、Infiniband 等高速互联技术连接，系统复杂度很高。这种高复杂度系统下的不可恢复的硬件错误、网络拥塞、驱动故障频发，带来了巨大的资源浪费。这是因为训练是同步的，单 GPU 节点的问题需要整个集群停下来，进行故障恢复。

大模型的训练基于大量的 minibatch 训练样本，在神经网络上进行前向、反向传播、借助 optimizer 调整模型参数。在数据并行范式下，每次 minibatch 迭代，各个节点使用不同的样本，计算梯度，集合通信全局做平均并广播结果到各个节点。其他并行方式类似，也有这样的基于 minibatch 划分的同步点。

常规的 checkpoint 机制下，不仅浪费了大量的 CPU 侧资源，GPU 资源实际上也被浪费了（这里指的不仅是空载导致的资源浪费）。**因为每次恢复都是从上一个检查点开始，假设训练过程中出错的点是随机的，那么平均下来，每次故障，所有的 GPU 都会重新执行 checkpoint interval 一半的计算。这部分计算是无意义的，因为出错前，这些数据已经被计算过了。**

作者观察到，训练过程中，大部分故障都是单 GPU 卡故障或者网络的故障，重启任务即可解决，CPU 侧或者是多节点故障比较少。至于 MTBF，普遍是在 24 小时内。OPT 175B 在 992 个 GPU 上训练了两个月，遇到了 100 余次故障。（从最近 Llama3.1 405B 的技术报告中，也可以发现他们在 54 天内碰到了 419 次故障。）

### JIT Checkpointing

这篇文章的核心思路是：故障后即时生成检查点进行恢复。

原理是：
- GPU 中的模型参数和 optimizer 状态，仅在训练中的一小段时间内变化，即 minibatch 的反向传播后到 optimizer 迭代那一步，我们可以追踪这个过程，从而可以在参数更新前/后做故障恢复。
- 大模型训练会依赖数据并行，因此当错误发生在 minibatch 中，可以在 replica 中找到相同的模型参数和 optimizer 状态。

因此他们提出可以检测训练中的故障，然后在（可恢复的）故障发生后进行即时恢复，而无需使用常见的定期 checkpoint 机制（当然后文也提了，你愿意两者结合也可以，作为兜底方法）。这样的好处是只需要重放单个 minibatch 即可，极大缩短了恢复耗时。

## 2. 关键技术

### 具备领域知识的 API 拦截

他们拦截了 NCCL 和 CUDA 动态链接库，在发生错误后触发 JIT 机制，而不是终止任务。（为此他们构建了一个动态链接库拦截 NCCL 和 CUDA，转发给后端的代理服务器执行，这很类似于他们在 Singularity 中的工作，为了方便，下文我们就用 Singularity 来指代这个劫持库和代理服务器。）

在第三章中，Singularity 将检测故障然后执行用户指定的回调函数，保存 CPU 和 GPU 状态，它还可以检测 hang 事件、异步拷贝显存到 CPU 侧。

在第四章中，Singularity 在正常情况下会记录 API 调用日志，检测故障，在故障发生后保存恢复 CPU、GPU 状态，再重放 API 调用。他们认为 Singularity 这种前后端分离的架构有助于维持用户进程无状态。（性能问题）

（这章标题提到的领域知识是什么呢？一方面是用户代码会调用到什么 API；另一方面就是训练期间的 NCCL 通信的同步点。）


## 3. 侵入用户代码的 JIT 机制

用户仅需要改动自己之前的 python 训练脚本，初始化 Singularity 的动态链接库，并利用它暴露的 C ffi 接口 `save_checkpoint` 即可。最直观的用法就是，用户使用一个 try-catch 块来执行训练，然后在发生错误时，调用 `save_checkpoint`。

他们在 NCCL 做集合通信时，检测是否有 hang 事件，因为这代表着某个节点失败了。在检测到这个失败事件后，他们会从数据并行产生的 replica 里面挑一个正常的节点，复制它的状态恢复故障节点。

整体流程如下：
1. 在各个节点检测是否有 hang 事件，可能代表别的节点故障了。
2. 当 hang 发生以后，各个健康节点把自己的状态拷贝到 checkpoint file（或抽象的分布式存储、乃至直接复制到远端节点中）。
3. 健康节点通知调度器，在 replica 完成 checkpoint 后，调度器终止任务，重新在排除故障 GPU 的资源组下重新启动任务。
4. 重启后，加载之前的 checkpoint，继续训练。

### 检测通信故障

已知：
- 目前主流框架中，计算和通信的核函数都是在不同的 CUDA Stream 上的，因此可以并行执行，借助 `cudaStreamWaitEvent` 去做同步。
- 以数据并行为例，optimizer 会在 all reduce 执行完成后，才会更新模型参数，就是在利用 `cudaStreamWaitEvent` 去等待 NCCL 的集合通信完毕。

因此，如果任意节点上失败了，all reduce 核函数就会卡住。显然，我们可以用一个看门狗机制去检测 hang 事件。这个机制可以实现在 Singularity 拦截库中，从而是用户无感的。他们拦截了 `cudaStreamWaitEvent` 和 `cudaEventRecord`，以及少量 NCCL API。他们在拦截库中，识别出 NCCL 所用的 CUDA Stream，和 NCCL 中的 CUDA Events，加到看门狗的事件列表中，第一次碰到 `cudaStreamWaitEvent` 的时候就开启一个线程，通过 `cudaEventQuery` 去查询 cuda events 状态。当某个 cuda event 超时了，就会去触发 `save_checkpoint`。

对于 FSDP、PP、TP、MP 等并行范式，也是有效的，同样是依赖 NCCL 的集合通信作为检测点。

### 存储 GPU 状态

在 `save_checkpoint` 的回调中，用户可以存储 GPU 侧的模型参数、optimizer 的状态，CPU 侧的迭代轮次、随机数生成器等信息。因为这个回调会在故障发生后被调用，所以回调中不能再使用集合通信，否则一些节点又 hang 住了。

这里有个难点是在 C++ 中，调用用户的 python 代码，涉及到 python GIL 死锁的问题。看门狗的线程在 C++ 侧，调用用户 python 代码需要获取 GIL，但是 GIL 可能已经被其他 hang 住的线程拿住了。为了解决这个问题，他们的看门狗线程注册了一些 signal handler，通过 pthread_sigqueue 向各个线程发送 SIGUSR1 信号，这个信号会释放 GIL。

另一个细节是 `cudaMemcpy` 是在默认流上执行的，和所有的 CUDA Stream 同步，会被 hang 住的 cuda 线程阻塞，需要换一个流进行拷贝。

同时在做 checkpoint 的过程中也可能会失败，因此 checkpoint 文件都是 rank-specific 的，还会有一个 meta file 用来标识某个 rank 节点是否 checkpoint 完毕，借助它可以识别破损的 checkpoints。

### 组装正确的 checkpoint

当健康节点完成 checkpoint 后，就会通知调度器，恢复要被替换的节点的任务。在 PP 和 MP 并行范式下，需要确保每个 pipeline stage 或者 model partition 都至少有一个 DP 的 replica 完成了 checkpoint。他们的拦截库暴露了一个 `jit_get_checkpoint_path` API 给用户的 python 训练脚本。

如果故障发生在前向、反向传播，或者 all reduce 操作，那健康节点都会卡在 all reduce 通信上，会存下来第 i 个 minibatch 下的模型参数和 optimizer 状态。但是如果是在 all reduce 之后、下一个 minibatch 之前出错的，例如在 optimizer 那里出错，那健康节点就会继续在第 i+1 个 minibatch 上执行前向、反向传播，直到第 i+1 次的 all reduce 卡住，才会发现又节点故障了。这两种情况，其实对于本文提出的 checkpoint 机制来说，都是符合预期的，不会又什么问题，只不过是保存的时机不同。

## 4. 用户无感的 JIT 机制

### 正常状态下的处理

在进程正常运行时，Singularity 就会记录所有的 NCCL、CUDA API 和他们的输入参数，存到一个 log buffer 里面（注意一些参数是需要深拷贝的）。在每次 minibatch 开始的时候，这个 log buffer 就会被清空。

为了保证正确性，需要所有的 CPU/GPU 交互都经过 CUDA API，因此像是 managed memory 这样的特性，是没法使用的。因为会有在 CPU、GPU 间会有隐式的内存拷贝。好消息是目前没有什么框架会用这套机制。（坏消息是在 Grace-Hopper 上，由于有 C2C Link 的存在，CUDA UVM 不再依赖缺页拷贝的方式，而是直接共享新的 SMMU 和 Cache Line，可以预见这种隐式地址传递会被应用起来）。
如果有这样的隐式内存操作，他们会放弃本章的无感 JIT 机制，回退到上一章的用户可控的 JIT 机制。

他们还每隔几轮就会验证日志是否正确。（这里提到做校验时仅适用确定性的 CUDA API，没看懂什么意思。）校验开始于反向传播的结束，即将开始 optimizer 阶段的时候，他们首先计算了所有 GPU buffer 的校验和。然后重置 GPU 状态，仅保留模型参数和 optimizer 状态数据，丢弃其他数据和 CUDA handler，重放一遍日志中的 API，执行正向和反向传播，计算 GPU buffer 的校验和。

### 对于可恢复的错误

为了检测故障，他们同样是实现了一个看门狗，当 hang 事件发生，看门狗会取消所有的在途 API 调用。此时 CPU 侧的 python 代码开始等待，故障恢复后再继续执行。

当故障被检测到了，GPU 状态被重置到当前 minibatch 开始的地方。

首先考虑前向、后向传播时的故障：
- GPU 仍然可用：模型参数和 optimizer 状态没有清理，其他的激活、梯度等数据会被释放。这种情况不需要对 GPU 显存进行拷贝做 checkpoint 和恢复，可能是短暂的网络问题或者是别的节点发生了 GPU 相关错误。
- GPU 可用，但是网络或驱动出错了，这种情况需要拷贝显存中的模型参数和 optimizer 状态，重启 Singularity 的后端 server 清理掉错误的状态信息，之后进行重建、恢复。
- GPU 不可用，但是没有硬件错误，可能是 CUDA 某个调用出错导致后续调用全部出错。重启 Singularity 的后端 server 清理掉错误的状态信息，从 DP 的 replica 节点复制显存中的模型参数和 optimizer 状态信息。

现在的重点是保证有一个 replica 已经存好了未经改动的模型参数和 optimizer 状态。这依赖于：
- 所有节点在修改自己的模型参数前，都会经过 NCCL 的 all reduce集合通信。
- 所有节点都会卡在这里，直到其他节点进入了集合通信阶段，等价于一个全局的同步点。
因此在单节点错误中，所有的其他 GPU 都会卡在 all reduce 这里。

恢复阶段，等所有的 GPU 都重置了它们的状态到 minibatch 开始阶段，就重新建立 NCCL 通信。因为是用户无感的，但是重建，所以需要使用 virtual cuda handler，Singularity 内部需要维护这样一个映射。重建完成后，开始重放 API，从而实现了无感保存恢复。

对于 optimizer 优化步骤中的故障：和第三章的描述一致，只是 i 轮和 i+1 轮的区别。

因为 Singularity 拦截的 API 太过底层，他们在 pytorch 框架中，增加了额外的 hook 点，区分训练的不同阶段，即前向、反向传播和 optimizer 优化步骤。这个 hook 点是在 pre-optimizer-step 和 post-optimizer-step 处，通知劫持层（同样可以通过 Singularity 的 C ffi）。

### 对于不可恢复的错误

借助 CRIU 迁移 CPU 侧状态。

使用独特的标记区分模型参数和 optimizer 状态的 GPU buffer。同样由于太过底层，没法使用 pytorch 中的张量名，所以使用了下面的特征来区分：
- buffer 在分配时的调用栈做哈希，来区分 buffer。这个调用栈也是通过 Singularity 来获取的；
- 一个序列号，以防多个 buffer 的调用栈相同；
- buffer size。

故障的 GPU rank 就可以根据 replica 保存的 buffer 来恢复了。