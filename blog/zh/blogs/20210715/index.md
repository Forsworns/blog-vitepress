---
title: XDP Tutorial 学习笔记（附 tutorial slides）
description: 学习一下 libbpf 下 XDP 的使用
tags: 
- bpf
- xdp
---

[[toc]]

# XDP Tutorial 学习笔记

xdp 的相关论文发在 2018 年 CONEXT 上，文章名称是 "The eXpress Data Path: Fast Programmable Packet Processing in the Operating System Kernel"，是 OA 的，可以直接[下载来看](https://dl.acm.org/doi/10.1145/3281411.3281443)。

学习一下 xdp 官方提供的教程，项目地址额为 [xdp-project/xdp-tutorial: XDP tutorial](https://github.com/xdp-project/xdp-tutorial)。该教程依赖的 libbpf 是19年的一版，直接用新版会有问题，需要下项目里的子模块指定的 [libbpf/libbpf at b91f53ec5f1aba2a9d01dc00c4434063abd921e8](https://github.com/libbpf/libbpf/tree/b91f53ec5f1aba2a9d01dc00c4434063abd921e8)。

## 教程的简介

比较基础的章节是 `basic01` 到 `basic04` 目录下的内容。

- `basic02`：讲解了 libbpf 怎么加载 bpf 代码的。让读者自己实现一个简化的加载过程。用户实现的函数，使用 `_` 前缀与教程中 xdp 团队提供的 api 相区分。相应的 api 是没有 `_` 前缀的，位于 `common` 目录下。例如，`common/common_user_bpf_xdp.c` 下的`load_bpf_and_xdp_attach()` 函数。
- `basic03`：讲解了 bpf map 的使用。
- `basic04`：讲解了跨应用共享 bpf map，使用的是 pinning maps 技术。

`tracing01` 到 `tracing04` 是做 tracing 方面的应用。

`packet01` 到 `packet03` 是从包的层面上做了 parsing、rewriting、redirecting。

`advance01` 是 xdp 和 tc 交互的例子。

`advance03` 很有趣，是一个比较完整的例子，展示了如何通过 xdp 在用户空间解析 IPV6 ICMP 报文，并发送回复。是用了一种新型的 socket 地址类型，`AF_XDP`，可以在 kernel 的文档中找到[ AF_XDP 的介绍](https://www.kernel.org/doc/html/latest/networking/af_xdp.html)。

这些教程中的 Assignment 的答案分布：`advance` 和 `tracing` 部分的答案就是在代码里的。`basic` 和 `packet` 部分的是在 `basic-solutions` 和`packet-solutions` 目录下。

## Advance03 示例的笔记

xdp 没有完全绕过内核，但是可以让包跳过内核的网络栈，直接从用户空间读取，可以通过 `AF_XDP` 的 `XDP_REDIRECT` 语义实现。

首先简要记录一下 `AF_XDP` 套接字。`AF_XDP` socket， 缩写为 XSK，可以通过系统调用 `socket()` 创建。每个 XSK 都有两个环来存储数据，一个 RX ring 和一个 TX ring。套接字能够用 RX ring 接收包，通过 TX ring 发送包。这些环是通过 `setsockopts` 中的选项 `XDP_RX_RING` 和 `XDP_TX_RING` 设置的。每个套接字至少需要其中的一个（以作为单侧的 source/sink node）。RX/TX ring 指向内存中一块叫做 UMEM 的数据。RX 和 TX 能够共享同一块 UMEM 区域，以防在 RX 和 TX 之间频繁地进行数据拷贝。另外，如果由于潜在的重传，一个包需要被保存一段时间，这些指针也能暂时指向别的包，避免拷贝数据。

在 BPF 侧的 AF_XDP 程序，参数是 `struct xdp_md`，包含原始 frame 的数据。可以返回一些状态来表示对该 frame 的处理意见，比如：

- `XDP_PASS`：继续传递到 Linux 后续的协议栈中处理。
- `XDP_REDIRECT`：将包通过 UMEM 传递到用户空间处理。
- `XDP_DROP`：直接丢弃这个包。
- `XDP_TX` 可以直接发回给网卡，可以用来在内核中做快速的回复。比如下面 Advance03 中做的事情，去交换 ICMP 报文的发送方和接收方。该例子其实可以在内核中完成，然后用 `XDP_TX` 发回去，不是必须 redirect 到用户空间再做。

### AF_XDP 的性能提升从何而来？

AF_XDP socket 非常快，在这个性能提升的背后隐藏了多少秘密呢？ AF_XDP 的 idea 背后的基础可以追溯到 [Van Jacobson](https://en.wikipedia.org/wiki/Van_Jacobson) 的关于 [network channels](https://lwn.net/Articles/169961/) 的报告中。在该报告中，描述了如何直接从驱动的 RX-queue （接收队列）去创建一个无锁的 [channel](https://lwn.net/Articles/169961/) 构建 AF_XDP socket。

（前面介绍 `AF_XDP` 的内容也提到了），AF_XDP 使用的队列是 Single-Producer/Single-Consumer (SPSC) 的描述符（descriptor）环形队列：

- **Single-Producer** (SP) 绑定到了某个特定的 RX **queue id** 上，通过 NAPI-softirq 确保在软中断（softirq）触发期间，只有一个 CPU 来处理一个 RX-queue id。

  :::tip

  NAPI 是 Linux 上采用的一种提高网络处理效率的技术，它的核心概念就是不采用中断的方式读取数据，否则包太多了，不停触发中断。而代之以首先采用中断唤醒数据接收的服务程序，然后 POLL 的方法来轮询数据。

  :::

- **Single-Consumer** (SC) 则是一个应用，从环中读取指向 UMEM 区域的描述符（descriptor）。

因此不需要对每个包都分配一次内存。可以在事先为 UMEM 内存区域进行分配（因此 UMEM 是有界的）。UMEM 包含了一些大小相同的块，环中的指针会引用它们的地址来引用这些块。这个地址就是在整个 UMEM 区域中的偏移量。用户空间负责为 UMEM 分配内存，分配的方法很灵活，可以用 malloc、mmap、huge pages 等形式。这个内存空间通过在 `setsockopt()` 方法中设置 `XDP_UMEM_REG` 触发相应的系统调用，注册到内核中。**需要注意的是**：这样就意味着你需要负责及时地将 frame 返回给 UMEM，并且需要为你的应用提前分配足够的内存。

Van Jacobson 在报告中谈到的 [transport signature](http://www.lemis.com/grog/Documentation/vj/lca06vj.pdf)，在 XDP/eBPF 程序中体现为选择将 frame `XDP_REDIRECT` 到哪个 AF_XDP socket。

### 示例代码阅读

打开 `advanced03-AF_XDP/af_xdp_kern.c`，它很精简，只有四十行代码。首先定义了两个 bpf map，一个存储 XSK，一个存储包的数量数据。然后定义了一个 bpf 程序，它的参数是 `struct xdp_md`，所以它是一个 **BPF_PROG_TYPE_XDP** 类型的 BPF 程序。这段程序通过 `SEC()` 宏放在了`xdp_sock` 段中，用 bpf helper 函数来和定义好的 bpf map 交互。注意其中的代码

```c
/* We pass every other packet */
if ((*pkt_count)++ & 1) 
	return XDP_PASS;
```

是间隔一个地直接返回 `XDP_PASS`，下一个包才会用 `bpf_redirect_map` 去转发。也就是说，过滤掉了一半的包。

在用户空间代码 `advanced03-AF_XDP/af_xdp_user.c` 中。首先是做了 bpf 用户空间程序必要的一些工作，比如 `setrlimit(RLIMIT_MEMLOCK, &rlim)` 去释放内存限制。这也是为什么必须用 sudo 权限运行 bpf 程序。

用 `stats_record` 结构体记录收发数量，在代码最后会单独开一个线程去调用 `stats_poll()` 函数打印实时的收发数据，用信号 `signal(SIGINT, exit_application)` 注册 `exit_application()` 函数，在结束时设置变量，帮助 `stats_poll()` 停止监测。

`xsk_socket_info` 结构体包装 `xsk_socket`，`xsk_umem_info` 结构体包装 `xsk_umem`。这部分代码会反复用到缩写 PROD 代表 producer，也就是发送端 tx；缩写 CONS 代表 consumer，也就是接收端 rx。因为 XSK 默认是 Single-Producer-Single-Consumer 的。

`xsk_configure_socket()` 初始化了 XSK，注意这里初始化发送端和接收端时，是传设置项 `xsk_cfg` 给库函数 `xsk_socket__create()`。`xsk_cfg.rx_size` 和 `xsk_cfg.tx_size` 分别初始化成了 `XSK_RING_CONS__DEFAULT_NUM_DESCS` 和 `XSK_RING_PROD__DEFAULT_NUM_DESCS`，他们会在库函数 `xsk_socket__create()` 中传递给系统调用 `setsockopt()` 去完成 XSK 中的 tx 和 rx 的创建。他们是定义在 `xsk.h` 中的宏，值都是 2048。事实上，只能被初始化成2的幂次。因为在库里的 `xsk.h` 中，获取 `xdp_desc` 的函数是这么定义的

```C
static inline struct xdp_desc *xsk_ring_prod__tx_desc(struct xsk_ring_prod *tx,
						      __u32 idx)
{
	struct xdp_desc *descs = (struct xdp_desc *)tx->ring;

	return &descs[idx & tx->mask];
}

static inline const struct xdp_desc *
xsk_ring_cons__rx_desc(const struct xsk_ring_cons *rx, __u32 idx)
{
	const struct xdp_desc *descs = (const struct xdp_desc *)rx->ring;

	return &descs[idx & rx->mask];
}


/* Rx/Tx descriptor */
struct xdp_desc {
	__u64 addr;
	__u32 len;
	__u32 options;
};
```

注意 `idx & tx->mask` 和  `idx & rx->mask` 是在用按位与运算去防止下标溢出，相当于在取模。这里的 `mask` 是在库里的 `xsk.c` 中的`xsk_socket__create()` 函数中初始化的，都是初始化成 `size-1` 的，也就是 2047，各位都是 1，如果 `size` 不是 2 的幂次，显然就不能这么干了。 

创建好 XSK，就可以监听了，这部分逻辑写在 `rx_and_process()` 中，用 `poll(struct pollfd *__fds, nfds_t __nfds, -1)` 系统调用去监听之前创建好的 XSK，在没有触发事件时阻塞。收到包后，调用 `handle_receive_packets()` 在 XSK 对应的 umem 中读取 rx 端，也就是 consumer 接收到的包。经过最深层的 `process_packet()` 处理，做的就是把包的指针转换成各层的首部，然后读取他们。因为实验中只有 IPV6 ICMP 报文，所以就直接像下面这样写了。处理完后，写入到 umem 中 tx 也就是 producer 管理的内存中。

```c
static bool process_packet(struct xsk_socket_info *xsk, uint64_t addr, uint32_t len)
{
	uint8_t *pkt = xsk_umem__get_data(xsk->umem->buffer, addr);
	// get header one by one
	struct ethhdr *eth = (struct ethhdr *) pkt;
    // pointer adds 1*sizeof(ethhdr) in fact
	struct ipv6hdr *ipv6 = (struct ipv6hdr *) (eth + 1); 
    // pointer adds 1*sizeof(ipv6hdr) in fact
	struct icmp6hdr *icmp = (struct icmp6hdr *) (ipv6 + 1);
		
    // ...
    
	// exchange source and destination
	memcpy(tmp_mac, eth->h_dest, ETH_ALEN);
	memcpy(eth->h_dest, eth->h_source, ETH_ALEN);
	memcpy(eth->h_source, tmp_mac, ETH_ALEN);

    // ...

	icmp->icmp6_type = ICMPV6_ECHO_REPLY;
	// replace icmp checksum in the packet
	csum_replace2(&icmp->icmp6_cksum,
				htons(ICMPV6_ECHO_REQUEST << 8),
				htons(ICMPV6_ECHO_REPLY << 8));
	// check remaining space in the ring 
	ret = xsk_ring_prod__reserve(&xsk->tx, 1, &tx_idx);
	if (ret != 1) {
		/* No more transmit slots, drop the packet */
		return false;
	}
	// write to tx
	xsk_ring_prod__tx_desc(&xsk->tx, tx_idx)->addr = addr;
	xsk_ring_prod__tx_desc(&xsk->tx, tx_idx)->len = len;
	xsk_ring_prod__submit(&xsk->tx, 1);
    
	return true;
}
```

至此该节内容结束。

### 可能碰到的问题

- 首先这些 BPF 相关的 demo 都是需要 `sudo` 去跑的，需要管理员权限。
- 系统内核太旧了，本身不支持 `AF_XDP` socket。

- 最常见的错误：为什么我在 AF_XDP socket 上看不到任何流量？

  正如你在上面了解到的，AF_XDP socket 绑定到了一个 **single RX-queue id** （出于性能考量）。因此，用户空间的程序只会收到某个特定的 RX-queue id  下的 frames。然而事实上网卡会通过 RSS-Hashing，把流量散列到不同的 RX-queues 之间。因此，流量可能没有到达你所期望的那个队列。

  :::tip

  RSS (Receive Side Scaling) Hashing 是一种能够在多处理器系统下使接收报文在多个CPU之间高效分发的网卡驱动技术。网卡对接收到的报文进行解析，获取IP地址、协议和端口五元组信息。网卡通过配置的 HASH 函数根据五元组信息计算出 HASH 值,也可以根据二、三或四元组进行计算。取HASH值的低几位（这个具体网卡可能不同）作为 RETA (redirection table) 的索引，根据 RETA 中存储的值分发到对应的 CPU。

  :::

  为了解决这个问题，你必须配置网卡，让流进入一个特定的 RX-queue，可以通过 ethtool 或 TC HW offloading filter 设置。下面的例子展示了如何配置网卡，将所有的 UDP ipv4 流量都导入 *RX-queue id* 42：

  ```
  ethtool -N <interface> flow-type udp4 action 42
  ```

  参数 *action* 指定了目标 *RX-queue*。一般来说，上面的这个流量转发的规则包含了匹配准则和 action。L2、L3 和 L4 header 值能被用来指定匹配准则。如果想要阅读更详细的文档，请查看 ethtool 的 man page （`man ethtool`）。它记载了 header 中所有能够用来作为匹配准则的值。

  其他替代的方案：

  1. 创建和 RX-queue 数量相同的  AF_XDP sockets，然后由用户空间使用 `poll/select` 等方法轮询这些 sockets。
  2. 出于测试目的，也可以把 RX-queue 的数量削减到 1，例如：使用命令 `ethtool -L <interface> combined 1`。

  但是在用 `testenv/testenv.sh` 脚本虚拟出来的网卡用不了 `ethtool` 的上面这些和 RX-queue 相关的命令。

### zero-copy 模式

正如前面提过的 AF_XDP 依赖于驱动的 `XDP_REDIRECT` action 实现。对于所有实现了 `XDP_REDIRECT` action 的驱动，就都支持 “copy-mode” 下的 AF_XDP。“copy-mode” 非常快，只拷贝一次 frame（包括所有 XDP 相关的 meta-data）到 UMEM 区域。用户空间的 API 也是如此。

为了支持 AF_XDP 的 “zero-copy” 模式，驱动需要在 NIC RX-ring 结构中直接实现并暴露出注册和使用 UMEM 区域的 API，以便使用 DMA。针对你的应用场景，在支持 “zero-copy”  的驱动上使用 “copy-mode” 仍然可能是有意义的。如果出于某些原因，并不是 RX-queue 中所有的流量都是要发给 AF_XDP socket 的，XDP 程序在 `XDP_REDIRECT` 和 `XDP_PASS` 间交替，如上面的 Advance03 示例中的那样，那么 “copy-mode” 可能是更好的选择。因为在 “zero-copy” 模式下使用 XDP_PASS 的代价很高，涉及到了为 frame 分配内存和执行内存拷贝。

### 在 STM32MP157A 开发板上跑这个 demo 碰到的问题

1. 板载系统没有开启 AF_XDP_SOCKET 支持（幸亏厂商提供了基于 5.4.31 内核的 Ubuntu 18.04，而且提供了他们构建开发板时的项目源码，只需要改下配置项，重新编译下内核，但凡他们搞个低版本的，闹不好我就寄了）。那么需要在内核源码目录下的`.config` 中重新编译一份 arm 架构的内核，将生成的 uImage 镜像和设备树文件拷贝到板子的 `/boot` 目录下。板子我是用的 sd 卡安装的 ubuntu，boot 目录没有自动挂载到，还要到 `/dev` 下找到它所在的分区（记录一下，我自己的板子是 block1p4），对应的 u-boot 的配置文件中如果启动的路径不对，可能也要修改。这里就庆幸自己是拿的 sd 卡装的，不然在只能进入到 u-boot 终端的情况下，只用 tftp 还处理不了 `boot` 目录下错误的路径配置。

2. 编译上面的例子时候，板子缺少 `libelf-dev` 包，会报错丢失 `<gelf.h>` 头文件。

3. 编译上面的例子时候，板子的`/usr/include/` 下没有 `asm` 文件夹，只有 `asm_generic`。有人博客里写，给 `asm_generic` 链接到 `asm` 就行了。亲测不是如此，二者包含的头文件并不相同。 

   后来发现该目录下，还有一个 `arm `开头的文件夹，推测里面应该包含了板子 `arm` 架构下的相关头文件。打开后果然如此，有一个`asm`，那么只需要在`/usr/include` 下做一个软连接 `ln -s` 到它，命名成 `asm` 就行了。

## 其他可以参考的资料

Linux manual page 上的 [bpf-helpers](https://man7.org/linux/man-pages/man7/bpf-helpers.7.html) 页面。

前几篇 bpf 的相关笔记。

组会和同学分享了近期的学习积累，做了一个 ppt，包含一些相关论文的概述，[slides 链接](./eBPF.pptx)。