---
title: 转载：A Full GPU Virtualization Solution with Mediated Pass-Through 概述
description: 早年 Intel Xen gVirt 实现，后来迁移到 KVMGT
tags: 
- GPU
- 虚拟化
- 转载
---

[[toc]]

早年 Intel Xen gVirt 实现，后来迁移到 KVMGT，ATC'14 原文

https://www.usenix.org/conference/atc14/technical-sessions/presentation/tian

中文笔记转载自知乎专栏，收藏目的，侵删，图就不搬运了，论文原图

https://zhuanlan.zhihu.com/p/383496258?utm_id=0


# 总结
gVirt是基于之前的工作XenGT，基于Xen hypervisor对Intel on-chip GPU实现了全GPU虚拟化。它主要是针对图形加速而不是GPGPU计算。gVirt认为frame buffer和command buffer是GPU中对性能影响最大的因素，它允许每一个VM以直通（direct pass-through）的方式，在没有hypervisor介入的情况下访问。为了达到此目的，graphics memory resource被gVirt Mediator划分，让每一个VM都在划分的内存中有自己的frame buffer和command buffer。同时，privileged GPU instruction被gVirt Mediator在Xen的driver domain中trap and emulated。这在没有很大性能开销的情况下保证了多个VM之间的隔离性。整个过程被叫做mediated pass-through。KVMGT是gVirt迁移到KVM上的版本，从Linux内核4.10开始，已经集成到了Linux内核中。

# Abstract
背景：GPU虚拟化技术是新兴虚拟化场景中的一种使能技术。

解决方法：本文介绍了gVirt，一种产品级的GPU虚拟化实现，具有以下特点：1）在guest里面运行本地图形驱动的全GPU虚拟化技术 2）同时实现好的性能、好的扩展性、guest之间安全的隔离的mediated pass-through。

特点：gVirt为每一个虚拟机提供了一个虚拟的完整的GPU。VM能在没有hypervisor介入的情况下直接访问对性能十分重要的资源，而来自guest的privileged operation以最小的开销进行trap-and-emulated。

结果：实验表明gVirt能够对GPU密集型的工作负载实现95%的本地性能，能够最多支持7个VM。

# 1. Introduction
背景：GPU的使用场景越来越多，越来越丰富的GPU使用场景对同时具有good performance、full features、sharing capability的全GPU虚拟化表现出了更高的需要。现现代的桌面虚拟化，无论是本地的XenClient，还是远端在服务器上的VMare Horizon，都需要GPU虚拟化来为用户在虚拟机里面支持未经破坏的本地图形用户体验。与此同时，云服务提供商开始建立GPU加速的虚拟化实例，把GPU计算资源作为服务来sell。只有全GPU虚拟化才能够支持这些各种各样应用的需要。

研究现状：当前，在performance、features、sharing capability之间找到平衡，实现全GPU虚拟化依然是一个挑战。图1展现了GPU虚拟化解决方法的光谱图。


Device Emulation具有很高的复杂度和非常低的性能，无法满足现实的需要。API forwarding利用了frontend driver，转发VM里面的高级别API调用到主机上，来实现加速。然而，API Forwarding面临着支持full feature的挑战，由于对于guest graphics software stack的侵入式修改的复杂性，以及guest和host graphics software stack之间的不兼容性。Direct pass-through为一个单独的VM制定了GPU，提供了full feature和最好的性能，但是牺牲了设备在VM直接的sharing capability。Mediated将对性能影响十分大的资源采用了pass through的方式，但是对privileged operations采取了trap and emulated的方法，有很好的性能、full feature、sharing capability。（实际上就是实现了performance 和 security的tradeoff）。

具体方法：本文介绍了gVirt，第一种产品级的GPU虚拟化实现，具有：1）在guest中运行native driver的全GPU虚拟化 2）同时实现good performance、scalability、VM之间secure isolation的mediated pass-through。一个虚拟化的GPU（vGPU），具有full feature，被展现给每一个VM。VM能够直接在没有hypervisor介入的情况下直接访问performance-critical resource。而来自guest的privileged operation通过trap and emulated的方式来在VM之间提供隔离性。vGPU的context是每个周期都进行切换，来在用户感知不到的情况下，让多个VM共享GPU。gVirt是在Xen中实现的，Intel CPU中的集成显卡。但是，gVirt的原理和架构对其他的GPU和hypervisor也是适用的。gVirt的source code已经开源了。

贡献：本文主要有如下贡献：

- 介绍了使用mediated pass-through，在guest中运行native graphics driver的全GPU虚拟化解决方法
- 通过graphics memory resource partitioning，address space balloning、direct execution of guest command buffer来pass through performance-critical resource access
- 通过在命令提交的时候监视和保护command buffer来隔离guest，并使用了smart shadowing
- 通过对硬件特征和graphics driver的虚拟化扩展提高了性能（对Linux内核模式的graphics driver修改了少于100行代码）（本文确实修改了驱动，Nvidia无法修改驱动，所以对其涉及方法能够利用与Nvidia上存疑）
- 为后续的GPU虚拟化研究提供了一个产品级的开源代码库，对Linux和Windows虚拟机都进行了全面的分析
- 证明gVirt能够在GPU-intensive workload实现95%的本地性能，对那些对CPU和GPU都要求高的应用实现83%的性能

# 2. GPU Programming Model
大体上，Intel Processor Graphics是按照图2显示的那样工作的。


render engine从command buffer中取GPU 命令，来加速不同特性中的图形渲染。display engine从frame buffer中取像素数据，然后把它们送到外部的显示器中来显示。

这种架构对多数现代GPU是适用的，但是可能在graphics memory如何实现上面有不同之处。Intel Processor Graphics将系统内存作为graphics memory，而其他GPU可能使用芯片内存。系统内存能够通过GPU page table来映射进多个虚拟地址空间。一个被称为global graphics memory的2GB全局虚拟地址空间，能够被CPU和GPU访问，是通过global page table来映射的。Local graphics memory space以多个2GB本地虚拟地址空间形式支持，但是被限制只能被render engine通过local page table访问。Global graphics memory主要是frame buffer，但是也被用作command buffer。在硬件加速过程中，会进行大量对local graphics memory的访问。

CPU是通过GPU-specific的命令来对GPU进行编程的，像图2中展示的那样，以生产者-消费者模型来进行编程的。graphics driver把GPU命令编程进command buffer，包括primary buffer和batch buffer，根据像OpenGL和DirectX一样的高层编程API。然后GPU从command buffer中取指令，并执行。primary buffer（即ring buffer）能够把其他的batch buffer连接在一起。primary buffer和ring buffer一个意思。batch buffer用来传输一个编程模型的多数指令（大约98%）。一个寄存器对（head，tail）被用来控制ring buffer。CPU通过更新tail来向GPU提交命令，GPU从head取命令，然后通过更新head来通知GPU，其提交命令已经执行结束。

已经介绍了GPU架构的虚拟化，对本文来说，非常有必要理解真实世界中的graphics application是如何使用GPU硬件的，来让我们能够更有效的在VM中对其进行虚拟化。选择了一些具有代表性的GPU-intensive 3D workload（Phoronix Test Suite），测试了四个重要的接口：frame buffer，command buffer，携带GPU 页表的GPU Page Table Entries，包含内存映射I/O寄存器的I/O寄存器。图3展示了运行Phoronix 3D 工作负载时，对四个接口的平均访问频率。


从图3可以看出，frame buffer和command buffer是对性能影响最大的资源。当应用被load的时候，很多源向量和像素被CPU写，所以frame buffer栈主要。在运行时，CPU通过命令来编程GPU，来对frame buffer进行渲染，所以command buffer称为主要被访问呢的对象。

总结：其实frame buffer就是用来存数据的，处理图像的时候，首先得把要处理的数据读取到frame buffer，这个过程中，cpu频繁往frame buffer中写入数据；command buffer用来存命令，在执行的时候，cpu需要频繁把命令发送到command buffer中，所以command buffer访问频繁。

# 3. Design and Implementation
gVirt是一个使用mediated pass-through的全GPU虚拟化解决方案。因此，gVirt为一个VM展现了一个全面的GPU，在VM里面运行本地graphics driver。挑战主要有三点 1）虚拟化一整个精密现代GPU的复杂性 2）由于多个VM共享GPU带来的性能开销 3）VM之间的安全隔离。gVir通过mediated pass-through的技术降低了复杂性，并实现了好的性能，enforces the secure isolation with the smart shadowing scheme。

## 3.1 Architecture
图4展示了gVirt的整体架构，基于Xen hypervisor，Dom0作为特权VM，还有多个用户级VM。


Xen hypervisor中的gVirt stub模块，扩展了内存虚拟化模块，包括用于user VM的EPT，和用于Dom0的PVMMU，来实现trap and pass-through的策略。每一个VM能直接运行本地graphics driver，并且能够直接访问对性能影响较大的资源：即frame buffer和command buffer。为了保护privileged resources，即I/O 寄存器和PTEs，来自user VM和Dom0的相关的访问，被trap and fowarded 到Dom0中的mediator driver来进行模拟。mediator利用hypercall来访问物理GPU。另外，mediator实现了一个GPU调度器，在Xen中与CPU调度器同时运行，用来负责在VM之间共享GPU。

gVirt使用物理GPU来直接执行来自VM的命令，因此避免了仿真render engine的复杂性。同时，对frame buffer和command buffer的pass-through，减少了hypervisor在CPU访问上的开销。GPU调度器保证了每一个VM都有有单直接GPU执行的时间。

gVirt Stub：是通过拓展Xen vMMU模块来选择性地trap或者pass-through对于某个GPU资源的guest access。传统的Xen只支持对于一个设备的全部I/O资源的pass-through或者trap，即要么采用device emulation，要么采用pass-through。gVirt通过操作EPT entry来选择性地把某块特定地址范围对user VM进行展示或隐藏。同时，利用PVMMU中的PET的一个二进制位来为Dom0选择性地trap或者pass-through某块内存区域。在两种情况下，privileged I/O都是要被trapped。所有被trapped的访问都被转发到mediator来进行模拟，mediator利用hypercall来访问物理GPU资源。

Mediator：gVirt mediator driver为privileged resource access仿真虚拟GPU，并且在虚拟GPU之间进行上下文切换。gVirt依靠Dom0 graphics driver来对物理设备进行初始化和管理能源。一种分离CPU和GPU的调度机制在gVirt中实现，基于两个原因：首先，GPU上下文切花不能的开销是CPU上下文切换开销的1000倍。第二，计算机系统中，CPU的核心数量和GPU的核心数量不同。gVirt实现了一个与现存CPU调度器分开的GPU调度器。这种分离调度模型引起了对来自CPU和GPU的资源的并行访问的需要。例如，当CPU正在访问VM1的graphics memory，GPU能够访问VM2的graphics memory，同时进行。

Native driver：gVirt在VM中运行native graphics driver，直接访问部分performance-critical 资源，privileged operation通过mediator进行仿真。

Qemu：使用QEMU来模拟遗留的VGA模式，使用virtual BIOS来启动user VMs。gVirt extension 模块决定是否一个仿真需要应该被定向到mediator还是Qemu。、

## 3.2 GPU Sharing
mediator管理所有VM的vGPU，通过将特权操作trap-and-emulated。mediator处理物理GPU 中断，也有可能对特定的VM产生虚拟中断。

Render engine scheduling：gVirt实现了一个粗粒度的服务质量策略。16ms被选择作为调度时间片，因为这要比人类能注意到的图像改变周期少。这样一个相对较大的时间片也是由于GPU进行context switch的时间大约是CPU context switch的1000倍，所以该时间片不能像CPU调度器一样小。来自一个VM的命令被连续提交给一个GPU，直到将该guest的时间片用完。gVirt在切换之前需要等待guest ring buffer变空，因为多数GPU是不支持抢占的，可能会影响公平性。为了最小化等待开销，gVirt实现了一种粗粒度的流控制机制，通过跟踪命令提交，保证在任何时候，堆积的命令都在一定范围之内。

Render context switch：当在vGPU之间切换render context时，gVirt会保存和回复内部pipeline state和I/O 寄存器state，还有cache/TLB刷新。保存/回复I/O寄存器状态能够通过对位于render context中的一系列寄存器来进行读/写操作来进行。在gVirt中用于切换context的步骤时：1）保存现在的I/O状态 2）刷新现有的context 3）利用额外的命令来保存现有的context 4）利用额外的命令来恢复新的context 5）恢复新context中的I/O状态。

gVirt用专用的ring buffer来执行额外的GPU 命令。

Display management：gVirt重用Dom0 graphics driver来初始化display engine，然后管理display来显示不同的VM frame buffer。当两个vGPU有同样的分辨率的时候，只有frame buffer 位置被切换。

## 3.3 Pass-Through
gVirt对frame buffer和command buffer直通来加速来自VM的performance-critical 操作。对global graphics memory space，大小为2GB，本文提出graphics memory resource partitioning 和 address space balloning机制。对于local graphics memory space，每一个具有2GB大小，本文实现了每个虚拟机2GB大小，local graphics memory 只可以由GPU来访问。

Graphics memory resource partitioning：gVirt在VM之间划分global graphics memory。分离CPU/GPU调度机制需要不同VM之间的global graphics memory能够被CPU和GPU同时访问呢，所以gVirt必须给每一个VM自己的资源。


从图6中可以看出，global graphics memory的大小对于性能影响是较小的。


Address space ballooning：本文减少了address space ballooning技术，用以减少地址转换开销。如图7所示，gVirt将划分信息暴露通过gVirt_info MMIO窗口暴露给VM graphics driver。graphics driver将其他VM的内存区域标识为“ballooned”。通过这种设计，guest view of global graphics memory space和host view是一样的。driver使用guest physical address编程的地址，能直接被硬件使用。

总结：本质上来说，他就是对于每一个VM来说，将其不能够使用的部分标识为“Ballooned“，然后每一个VM都能够对整个global graphics memory space可见，只是限制了其访问范围。这样，VM里面的内存地址和host上的内存地址就一致了，不需要地址转换了。

Per-VM local graphics memory：gVirt允许每一个VM使用其自己的全部的local graphics memory space。local graphics memory space只对GPU中的render engine可见，任何VM编程的有效的local graphics memory address都能被GPU直接使用。当需要切换render ownership的时候，mediator会在VM之间切换local graphics memory space。

## 3.4 GPU Page Table Virtualization
gVirt使用shared shadow global page table 和 per-VM shadow local page table来对GPU页表进行虚拟化。

Shared shadow global page table：为了实现资源划分和address space ballooning，gVirt为所有VM实现了shared shadow global page table。每一个VM具有其自己的guest global page table，从graphics memory page number翻译到guest memory page number（GPN）。shadow global page table被从graphics memory 怕个 number翻译到Host memory page number（HPN）。shared page table为所有VM维持转换，用以支持对CPU和GPU的并行访问。gVirt实现了一个单一、共享的shadow page table，通过trapping guest PTE updates。如图8所示，MMIO space中的global page table具有512K PTE entries，每一个entry指向4KB系统内存，所以共创造了2GB的global graphics memory space。


Per-VM Shadow local page tables：为了支持local graphics memory 的pass-through访问呢，gVirt实现了per-VM shadow local page table。local graphics memory只能被render engine访问。

## 3.5 Security
Pass-through对于性能很友好，但是必须要满足以下条件，来保证安全隔离。1）一个VM必须被禁止映射未经授权的graphics memory page 2）所有被VM编程的GPU registers 和 command，必须被验证只包含授权的graphics memory address 3）gVirt需要解决拒绝服务攻击，防止一个VM让GPU 拒绝服务

# 总结：
- 需要对GPU驱动进行修改
- 估计global graphics memory只有2GB，不能无限分下去
- 说白了，不就是command buffer和frame buffer位于global graphics memory 中，然后这两个让虚拟机里面的驱动直接访问，其他组件就得通过trap来保证安全性
- 和”Investigating Virtual Passthrough I/O on Commodity Devices“有点不一样啊，人家那个是对与某些特权操作进行trap，然后对其余的都进行passthrough，这个是对组件
- 后续的”gScale： Scaling up GPU Virtualization with Dynamic Sharing of Graphics Memory Space不就是关于解决scaliability的