---
title: 使用 libbpf-bootstrap 构建 BPF 程序
description: libbpf介绍，相关博客翻译笔记
tags: 
- bpf
- 翻译
---

[[toc]]

# 使用 libbpf-bootstrap 构建 BPF 程序

libbpf 是一个比 [BCC](https://github.com/iovisor/bcc/)  更新的 BPF 开发库，也是最新的 BPF 开发推荐方式，官方提供了 [C](https://github.com/libbpf/libbpf) 和 [Rust](https://github.com/libbpf/libbpf-rs) 的库实现。libbpf 支持最新的 BPF CO-RE 特性（单次编译到处执行），它不像 BCC 依赖于 Clang/LLVM 运行时，也不是通过封装后的 Python 接口书写而是直接使用 C 或 Rust 进行开发，也不需要内核开发头文件。所以转向 libbpf 的使用吧。为了方便初学者和习惯了 BCC 的开发者，官方提供了 [libbpf-bootstrap](https://github.com/libbpf/libbpf-bootstrap) 示例项目，BCC 项目里也有一些用 libbpf 构建的工具 [bcc/libbpf-tools](https://github.com/iovisor/bcc/tree/master/libbpf-tools)。

下面的内容翻译自相关[博客：Building BPF applications with libbpf-bootstrap](https://nakryiko.com/posts/libbpf-bootstrap/)

使用 [libbpf-bootstrap](https://github.com/libbpf/libbpf-bootstrap) 脚手架项目快速上手 libbpf，该项目已经配置好了环境，能够让开发者直接找到 BPF 的乐趣所在。下面我们将一起查看 libbpf-bootstrap 到底干了些什么，以及这一切是如何发挥作用的。

## 为什么使用 libbpf-bootstrp？

BPF 是一种令人惊异的内核技术，它能够让开发者一览内核函数是如何工作的，即使该开发者没有内核开发的经验，也不需要该开发者花费大量时间在内核开发环境配置上。BPF 也降低了在检阅内核工作状态时 OS 崩溃的风险。一旦你掌握了 BPF，你就会了解其中的乐趣和它无穷的能力。

但是 BPF 的起步对很多人来说，仍然会是一个令人生畏的环节。因为构建一个 BPF 应用程序的工作流，即使是一个 “hello world” 程序都需要大量的步骤。这会是令人失望的，而且会吓走一大片开发者。这个过程不难，但是知晓其中必要的步骤仍然可能会劝退很多人，即使他们知道 BPF 的威力。

[libbpf-bootstrap](https://github.com/libbpf/libbpf-bootstrap) 就是这样一个 BPF 游乐场，它已经尽可能地为初学者配置好了环境，帮助他们可以直接步入到 BPF 程序的书写。它综合了 BPF 社区多年来的最佳实践，并且提供了一个现代化的、便捷的工作流。libbpf-bootstrap 依赖于 libbpf 并且使用了一个很简单的 Makefile。对于需要更高级设置的用户，它也是一个好的起点。即使这个 Makefile不会被直接使用到，也可以很轻易地迁移到别的构建系统上。

libbpf-bootstrap 中有两个示例 BPF 程序（目前已经不止这两个了）： `minimal` 和 `bootstrap`。`minimal` 是能够编译、加载和运行的最小化的 BPF 程序，它做的就是 BPF 中等价的`printf("Hello, World!")`。既然是最小化的一个程序，它也不会依赖于很新的内核特性，即使是旧的内核版本，它也应该会正常工作。

运行 `minimal` 示例可以很快地在本地完成一个小的测试，但是它不能反映出用于生产环境下的 BPF 程序是否在各种各样的内核上都是可以使用的。`bootstrap` 是一个这样的示例，它构建了一个最小化的可迁移的 BPF 程序。为了满足这个需求，它依赖于 [BPF CO-RE](https://nakryiko.com/posts/bpf-portability-and-co-re/) 特性和内核的 [BTF](https://nakryiko.com/posts/btf-dedup/) 支持，所以确保你的 Linux 内核在构建的时候选择了`CONFIG_DEBUG_INFO_BTF=y` 内核选项。可以参考 [libbpf README](https://github.com/libbpf/libbpf#bpf-co-re-compile-once--run-everywhere)，查阅已经配置好这些的 Linux 发行版。如果你想要减少构建自定义内核的麻烦，就尽可能地使用更新的内核吧。

另外，`bootstrap` 还演示了 BPF 全局变量（Linux 5.5+）和 [BPF ring buffer](https://nakryiko.com/posts/bpf-ringbuf)（Linux 5.8+）的使用。这些特性不是构建 BPF 程序必要的组件，但是他们带来了巨大的可用性提升和更现代化的 BPF 程序开发方法，所以他们被加入到了这个示例中。

## 背景

BPF 是一个持续演进的技术，这意味着新特性将会被持续添加进来，所以视你要采用的 BPF 特性，你可能需要更新的内核版本。但是 BPF 社区非常严肃地考虑了后向兼容性，所以旧的内核仍然可以运行 BPF 程序，假如你不需要新功能的话。所以你的 BPF 程序的逻辑越简单，特性越少，你的 BPF 程序就可以运行在越旧的内核上。

BPF 的用户体验是一直在提升的，更新的内核版本中的 BPF 提供了更加巨大的易用性上的改进。所以如果你只是刚起步，不需要支持旧版的内核，还是用最新的内核吧，让自己少掉点头发。

BPF 程序一般是用 C 语言写的，会有一些代码结构方面的拓展，来让 [libbpf](https://github.com/libbpf/libbpf) 知晓 BPF 代码的结构，更高效地处理他们，[Clang](https://clang.llvm.org/) 是 BPF 代码编译推荐使用的编译器，通常也会推荐使用最新的 Clang。Clang 10 或者更新的版本能够处理大多数的 BPF 特性，但是更先进的 [BPF CO-RE](https://nakryiko.com/posts/bpf-portability-and-co-re/) 特性需要 Clang 11 甚至是 Clang 12（例如，一些最近的 CO-RE relocation built-ins）。

libbpf-bootstrap 打包了 libbpf （作为一个 Git submodule）和 bpftool （只适用于 x86-64 体系）来避免任何你的某个特定 Linux 发行版的依赖需求。**你的系统需要安装 `zlib` (`libz-dev` 或 `zlib-devel` 包) 和`libelf` (`libelf-dev` 或 `elfutils-libelf-devel` package) 。这些是 `libbpf` 编译和正确运行的必要依赖**，（注意对于 BTF 的支持情况，需要参考官方文档或之前的[笔记](/zh/blogs/20210311/#libbpf)，只有较新的发行版直接暴露了 BTF 到 `/sys/kernel/btf/vmlinux`）。

这篇文章不是 BPF 技术的入门介绍，所以假定读者已经知晓了基本的概念，比如 BPF program，BPF map，BPF hooks (attach points) 。如果你需要重温一下基础知识，可以看[这些](https://docs.cilium.io/en/latest/bpf/) [资料](https://qmonnet.github.io/whirl-offload/2016/09/01/dive-into-bpf/)。

下面将会详细介绍 [libbpf-bootstrap](https://github.com/libbpf/libbpf-bootstrap) 的结构，它的 Makefile 和 `minimal` 、`bootstrap` 两个示例。我们将会了解 libbpf 的代码风格，了解如何把 BPF C 程序构建成使用 libbpf 作为 BPF program loader 的形式，以及如何使用用户空间的 libbpf API 和你的 BPF 程序交互。

## Libbpf-bootstrap 概览

下面就是 [`libbpf-bootstrap`](https://github.com/libbpf/libbpf-bootstrap) 的目录结构

```
$ tree
.
├── libbpf
│   ├── ...
│   ... 
├── LICENSE
├── README.md
├── src
│   ├── bootstrap.bpf.c
│   ├── bootstrap.c
│   ├── bootstrap.h
│   ├── Makefile
│   ├── minimal.bpf.c
│   ├── minimal.c
│   ├── vmlinux_508.h
│   └── vmlinux.h -> vmlinux_508.h
└── tools
    ├── bpftool
    └── gen_vmlinux_h.sh

16 directories, 85 files
```

`libbpf-bootstrap` 把 libbpf 打包成了 `libbpf/` 子目录下的一个子模块来避免系统侧对 libbpf 的依赖。

`tools/` 包含了 `bpftool` 的二进制文件，用来构建你的 BPF 程序的  [BPF skeletons](https://nakryiko.com/posts/bcc-to-libbpf-howto-guide/#bpf-skeleton-and-bpf-app-lifecycle)。 类似 libbpf，它被打包进来以避免依赖问题。

另外， bpftool 能被用来生成你自己的包含内核类型定义的 `vmlinux.h`头文件。 一般来说你不需要这么做，因为 libbpf-bootstrap 已经在 `src/` 子目录下提供了预先生成的  [vmlinux.h](https://raw.githubusercontent.com/libbpf/libbpf-bootstrap/master/src/vmlinux_508.h)。 它基于 Linux 5.8 内核选项的默认设置，激活了一些额外的和 BPF 相关的功能的配置项。这意味着它已经有了一些通用的内核类型和常量。因为有  [BPF CO-RE](https://nakryiko.com/posts/bpf-portability-and-co-re/)， `vmlinux.h` 不需要特定地去匹配你的内核配置和版本。但是如果你仍然要生成你自己的 `vmlinux.h`，尽管参考 [`tools/gen_vmlinux_h.sh`](https://github.com/libbpf/libbpf-bootstrap/blob/master/tools/gen_vmlinux_h.sh) 脚本吧，去看看它是如何做的。

[Makefile](https://github.com/libbpf/libbpf-bootstrap/blob/master/src/Makefile) 定义了必要的构建规则，来编译所有提供的 BPF 应用。它遵从一个简单的文件命名规则。

- `<app>.bpf.c` 文件是 BPF C 代码包含了将在内核上下文中执行的逻辑。
- `<app>.c` 是用户空间的 C 代码，加载了 BPF 代码，在应用的整个生命周期内和它交互。
- *optional* `<app>.h` 是一个头文件，包含了常见的类型定义，是在 BPF 代码和用户空间代码之间共享的。


## Minimal app

`minimal` 是一个给初学者的很好的例子。它是一个最小化的 BPF 试验场所。它不使用 CO-RE 特性，所以你可以在旧些的内核上使用它，只需要 include 你的内核类型定义。这个例子不适合拿来做生产环境下用，但是做学习用途还是很好的。

### The BPF side

下面就是 BPF 侧的代码 ([minimal.bpf.c](https://github.com/libbpf/libbpf-bootstrap/blob/master/src/minimal.bpf.c)) ：

```c
// SPDX-License-Identifier: GPL-2.0 OR BSD-3-Clause
/* Copyright (c) 2020 Facebook */
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

char LICENSE[] SEC("license") = "Dual BSD/GPL";

int my_pid = 0;

SEC("tp/syscalls/sys_enter_write")
int handle_tp(void *ctx)
{
	int pid = bpf_get_current_pid_tgid() >> 32;

	if (pid != my_pid)
		return 0;

	bpf_printk("BPF triggered from PID %d.\n", pid);

	return 0;
}
```

`#include <linux/bpf.h>` 导入了一些基础的、必要的 BPF 相关的类型和常量，以便使用内核侧的 BPF API，例如 BPF helper function flags。这个头文件是之后导入 `bpf_helpers.h` 这个头文件所必须的前提。而 `bpf_helpers.h` 是由 `libbpf` 提供的，包含了大多数常用的宏、常量和 BPF helper 的定义，几乎会在每个 BPF 应用中用到。例如上面用到的`bpf_get_current_pid_tgid()` 就是一个 BPF helper。

`LICENSE` 变量定义了你的 BPF 代码的 license。在内核开发中，明确 license 是必须的。一些 BPF 功能对于不兼容 GPL 的代码是不可用的。注意特殊的 `SEC("license")` 注解。 定义在 `bpf_helpers.h` 中的 `SEC()`  把变量和函数放到了特殊的段中。 `SEC("license")` 和一些其他的段名，是 libbpf 规定的，只要遵循就好了。

接下来，我们看看 BPF 特性“全局变量”是如何使用的。代码 `int my_pid = 0;` 所做的正是你所想象的事情：它定义了一个全局变量，BPF 代码可以读取和更新它，就像其他用户空间的 C 代码对待全局变量那样。使用 BPF 全局变量维护程序的状态很方便，而且性能表现也不错。另外，这样的全局变量能够从用户侧读写。这个特性是从 Linux 5.5 之后才支持的。在用额外的设置项配置 BPF 程序的时候常常会用到它。它也经常用于在内核中的 BPF 代码和用户侧的控制代码之间传递数据。

`SEC("tp/syscalls/sys_enter_write") int handle_tp(void *ctx) { ... }` 定义了 BPF 程序，它会被加载到内核中。它是由一个普通的 C 函数定义的，使用 `SEC()` 宏放在一个特殊的段中。段名定义了 libbpf 程序创建的是什么类型的 BPF 程序，以及它是附着到内核上哪个地方的。在这个例子中，我们是定义了一个 tracepoint BPF 程序，每次用户空间的应用调用了系统调用 `write()` 的时候，就会触发它。

> 在同一个 BPF C 程序文件中，可能有多个 BPF 程序。他们可以是不同类型的，有着不同的 `SEC()` 宏。例如，你可以用不同的 BPF 程序追踪不同的系统调用或其他事件（如网络包的处理）。你也可以使用相同的 `SEC()` 宏来定义多个 BPF 程序，libbpf 会自动处理他们。在同一个 BPF C 代码文件中的所有的 BPF 程序共享所有的全局状态，例如上面例子中的 `my_pid` 变量，如果使用了 BPF map，它也是共享的。这常常用在 BPF 程序的协作中。

下面仔细看看 BPF 程序 `handle_tp` 是在干嘛：

```c
    int pid = bpf_get_current_pid_tgid() >> 32;

    if (pid != my_pid)
        return 0;
```

这部分获取了 PID，或者说是内核术语中的 "TGID" ，它存储在 `bpf_get_current_pid_tgid()` 返回值的高 32 位。接着，它会查看触发了 `write()` 系统调用的进程是否是我们的 `minimal` 进程。这对于一个很繁忙的系统是十分重要的，因为很可能有大量不相关的进程触发了 `write()`，使得你很难用这段 BPF 代码进行实验得到预期的结果。全局变量 `my_pid` 是通过下面的用户空间的代码进行初始化的，它会被初始化成真实的 PID 值。

```c
	bpf_printk("BPF triggered from PID %d.\n", pid);
```

这就是 BPF 中的 `printf("Hello, world!\n")`。它输出格式化的字符串到一个特殊的文件，叫作 `/sys/kernel/debug/tracing/trace_pipe`，你可以从控制台中去查看它的内容，注意你需要 `sudo` 来取得查看它的权限：

```bash
$ sudo cat /sys/kernel/debug/tracing/trace_pipe
	<...>-3840345 [010] d... 3220701.101143: bpf_trace_printk: BPF triggered from PID 3840345.
	<...>-3840345 [010] d... 3220702.101265: bpf_trace_printk: BPF triggered from PID 3840345.
```

> `bpf_printk()` 帮助函数和 `trace_pipe` 文件一般不在生产环境中使用，它们是用来辅助 BPF 程序的 debug 的，帮助开发者知道自己的代码到底干了些什么事情。目前还没有 BPF 的调试工具，所以这种输出调试是目前最方便的调试方法了。

这就是 BPF 侧的 `minimal` 应用了，你可以加一些别的代码到 `handle_tp()` 中，按你所需去拓展它。

### The user-space side

让我们看看用户空间到底做了啥 ([minimal.c](https://github.com/libbpf/libbpf-bootstrap/blob/master/src/minimal.c))，我们会跳过一些显然的部分，但是无论如何，读者都应该去看一下完整的代码。

```c
#include "minimal.skel.h"
```

这里导入了 BPF 代码 `minimal.bpf.c` 中的 BPF skeleton。它是在 Makefile中的某一步，由 bpftool 自动生成的文件，它高度抽象了`minimal.bpf.c` 的结构。它也简化了 BPF 代码部署的逻辑，将编译出的 BPF 目标代码嵌入到了头文件中，该头文件又会被用户空间的代码所引用。你的应用程序的二进制文件中不会有其他多余的文件了，就导入它就好了。

> BPF skeleton 是完全由 `libbpf` 构造出的，内核对它一无所知。但是它的存在显著提升了 BPF 开发体验，所以, 最好熟悉一下它。可以看这篇 [博客](https://nakryiko.com/posts/bcc-to-libbpf-howto-guide/#bpf-skeleton-and-bpf-app-lifecycle) 来了解 BPF skeleton 的细节。

libbpf-bootstrap 的 BPF skeletons 在成功 `make` 后，生成到了 `src/.output/<app>.skel.h` 中。为了获取直观感受，下面是 `minimal.bpf.c` 的 skeletons 高度抽象后的概览：

```c
/* SPDX-License-Identifier: (LGPL-2.1 OR BSD-2-Clause) */

/* THIS FILE IS AUTOGENERATED! */
#ifndef __MINIMAL_BPF_SKEL_H__
#define __MINIMAL_BPF_SKEL_H__

#include <stdlib.h>
#include <bpf/libbpf.h>

struct minimal_bpf {
	struct bpf_object_skeleton *skeleton;
	struct bpf_object *obj;
	struct {
		struct bpf_map *bss;
	} maps;
	struct {
		struct bpf_program *handle_tp;
	} progs;
	struct {
		struct bpf_link *handle_tp;
	} links;
	struct minimal_bpf__bss {
		int my_pid;
	} *bss;
};

static inline void minimal_bpf__destroy(struct minimal_bpf *obj) { ... }
static inline struct minimal_bpf *minimal_bpf__open_opts(const struct bpf_object_open_opts *opts) { ... }
static inline struct minimal_bpf *minimal_bpf__open(void) { ... }
static inline int minimal_bpf__load(struct minimal_bpf *obj) { ... }
static inline struct minimal_bpf *minimal_bpf__open_and_load(void) { ... }
static inline int minimal_bpf__attach(struct minimal_bpf *obj) { ... }
static inline void minimal_bpf__detach(struct minimal_bpf *obj) { ... }

#endif /* __MINIMAL_BPF_SKEL_H__ */
```

上面的自动生成的代码中，会有一个 `struct bpf_object *obj;` ，它会被传递给 libbpf 的 API。它也包含有 `maps`， `progs` 和 `links` 等段，可以直接获取到你的 BPF 代码中定义的 BPF map 和程序。例如，前面提到的 BPF 程序 `handle_tp` 。这些引用能够直接传递给 libbpf的 API 去完成 BPF map/program/link 相关的工作。Skeleton 也可以包含可选的 bss、data、rodata 段，从而可以直接从用户空间访问 BPF 全局变量而不必使用额外的系统调用。在这种情况下，我们的`my_pid` BPF 变量对应的是 `bss->my_pid` 域。

现在看看  `minimal` 应用的 `main()` 函数在干些什么：

```c
int main(int argc, char **argv)
{
	struct minimal_bpf *skel;
	int err;

	/* Set up libbpf errors and debug info callback */
	libbpf_set_print(libbpf_print_fn);
```

`libbpf_set_print()` 提供了一个自定义的回调给所有的 libbpf 日志输出。这很有用，特别是在活跃的开发时期，因为它允许捕获有用的 libbpf 调试日志。默认情况下，libbpf 将只打印错误级别的信息。调试日志则会帮助我们更快地定位问题。

> 想报告 libbpf 或你的基于 libbpf 开发的应用的问题，可以发送邮件到 [bpf@vger.kernel.org](mailto://bpf@vger.kernel.org) 邮件列表，记得附上你的调试信息。

在 `minimal` 这个示例中， `libbpf_print_fn()`  只是把所有内容都打印到标准输出 stdout。

```c
	/* Bump RLIMIT_MEMLOCK to allow BPF sub-system to do anything */
	bump_memlock_rlimit();
```

这是一步令人困惑但也是必要的步骤，大多数 BPF 程序都要这么去做。它放松了内核中对每个用户内存的约束，允许 BPF 子系统分配必要的资源给你的 BPF 程序和 BPF maps 等。这个限制很可能会被马上移除掉，但是目前你需要打开这个内存限制，即 `RLIMIT_MEMLOCK` [limit](https://man7.org/linux/man-pages/man2/getrlimit.2.html) 。通过 `minimal` 代码中使用的 `setrlimit(RLIMIT_MEMLOCK, ...)` ，是最简单也最便捷的方法。

```c
	/* Load and verify BPF application */
	skel = minimal_bpf__open_and_load();
	if (!skel) {
		fprintf(stderr, "Failed to open and load BPF skeleton\n");
		return 1;
	}
```

现在，使用自动生成的 BPF skeleton，加载 BPF 程序到内核中，然后让 BPF verifier 校验它是否合法，如果这步成功了，你的 BPF 代码就是正确的，而且可以附着到任何一个你需要的 BPF hook 上。

```c
	/* ensure BPF program only handles write() syscalls from our process */
	skel->bss->my_pid = getpid();
```

但是首先，我们需要与 BPF 交流我们的用户态程序的 PID，以便它能够过滤掉不相关的进程触发的 `write()`事件。上面的这行代码会直接设置映射过的内存区域的 BPF 全局变量 `my_pid`。如上面提到的，这就是用户态读写 BPF 全局变量的方式。

```c
	/* Attach tracepoint handler */
	err = minimal_bpf__attach(skel);
	if (err) {
		fprintf(stderr, "Failed to attach BPF skeleton\n");
		goto cleanup;
	}

	printf("Successfully started!\n");
```

终于，我们可以将 BPF 程序`handle_tp` 附着到到内核的锚点上（即上面的 BPF hook）。BPF 程序会随之响应，内核会开始在内核上下文中，回应每个 `write()` 系统调用，执行我们自定义的 BPF 代码。

> 通过查看 `SEC()` 注解，libbpf 能够自动决定在什么地方附着 BPF 程序。这并非对所有类型的 BPF 程序都适用，但是对大多数还是适用的，比如：tracepoints、kprobes 等等（具体的 BPF 程序种类，可以参考之前的[笔记](/zh/blogs/20210329/#常见-bpf-prog-type-定义)）。另外，libbpf 提供了额外的 API 来附着 BPF 程序，可以通过用户的编程实现。

```c
	for (;;) {
		/* trigger our BPF program */
		fprintf(stderr, ".");
		sleep(1);
	}
```

上面代码中的无穷循环确保了 BPF 程序 `handle_tp` 能够一直附着在内核中，直到用户关掉进程，如按下 `Ctrl-C`。同时，它还会周期性地（每秒）调用 `fprintf(stderr, ...)`，从而触发一次 `write()` 系统调用。通过这种方法，可以通过 `handle_tp` 监控内核的内部情况和状态随时间的变化。

```makefile
cleanup:
	minimal_bpf__destroy(skel);
	return -err;
}
```

如果前面任一个步骤错误了，`minimal_bpf__destroy()` 将会像上面这几行代码所述，在内核和用户空间清除所有的资源。这是一个好习惯，但是即使你的程序还没清理就崩溃了，内核也仍然能够清理掉资源。好吧，至少大多数情况下是这样的。也有一些类型的 BPF 程序，会在内核中一直保持活跃，即使它自己的用户空间的进程已经结束了。所以必要的话还是确保你检查过释放掉资源了。这就是 `minimal` 应用的全部的内容了，使用了 BPF skeleton 后，这一切都是很直截了当的。

## Makefile

既然我们已经浏览过了 `minimal` 应用，我们已经有足够的知识来看看 [Makefile](https://github.com/libbpf/libbpf-bootstrap/blob/master/src/Makefile) 到底干了些什么。我们将跳过样板部分，关注核心的部分。

```makefile
INCLUDES := -I$(OUTPUT)
CFLAGS := -g -Wall
ARCH := $(shell uname -m | sed 's/x86_64/x86/')
```

这里我们定义一些在编译时使用的额外的参数。默认情况下，所有的中间文件都会写入到 `src/.output/` 子文件夹下。所以这个文件夹会被添加到 C 编译器的包含路径中，以便找到 BPF skeletons 和 libbpf 头文件。所有的用户空间文件在编译时都会带有调试信息（即 `-g` 选项），并且不会有任何的优化，来简化调试工作。 `ARCH` 参数捕获了宿主机的操作系统的架构，之后和定义在 libbpf 库中`bpf_tracing.h` 底层的 tracing helper 宏一起被传入到 BPF 代码编译步骤中。

```makefile
APPS = minimal bootstrap
```

这里提供了目标的应用名称，添加到 `APPS` 变量中的会被编译。每个应用都定义了相关的 make 目标，所以你可以通过下面的命令构建对应的文件：

```bash
$ make minimal
```

整个构建的过程分为下面的几步。首先，libbpf 以一个静态库的形式构建，它的 API 头文件之后被安装到了 `.output/` 中：

```makefile
# Build libbpf
$(LIBBPF_OBJ): $(wildcard $(LIBBPF_SRC)/*.[ch] $(LIBBPF_SRC)/Makefile) | $(OUTPUT)/libbpf
	$(call msg,LIB,$@)
	$(Q)$(MAKE) -C $(LIBBPF_SRC) BUILD_STATIC_ONLY=1		      \
		    OBJDIR=$(dir $@)/libbpf DESTDIR=$(dir $@)		      \
		    INCLUDEDIR= LIBDIR= UAPIDIR=			      \
		    install
```

如果你想要构建系统层面的共享库 `libbpf` ，你可以移除上面的步骤，然后对应地调整编译规则。

下一步构建了 BPF C 代码，即 `*.bpf.c`，编译到了一个目标文件：

```makefile
# Build BPF code
$(OUTPUT)/%.bpf.o: %.bpf.c $(LIBBPF_OBJ) $(wildcard %.h) vmlinux.h | $(OUTPUT)
	$(call msg,BPF,$@)
	$(Q)$(CLANG) -g -O2 -target bpf -D__TARGET_ARCH_$(ARCH) $(INCLUDES) -c $(filter %.c,$^) -o $@
	$(Q)$(LLVM_STRIP) -g $@ # strip useless DWARF info
```

我们使用 Clang 来编译， `-g` 是必须的选项，来让 Clang 生成 BTF 相关的调试信息。 `-O2` 也是 BPF 编译中必要的， `-D__TARGET_ARCH_$(ARCH)` 为 `bpf_tracing.h` 定义了必要的宏来处理底层的 `struct pt_regs` 宏。你可以忽略它如果你不是在处理内核探测程序 kprobes 和 `struct pt_regs`。最后，我们从生成的 `.o` 文件中去除掉 DWARF 信息。因为它不会被用到，基本上都是 Clang 编译的副产物。

> BTF 是确保 BPF 正常工作的唯一的必要信息，因此会被保留下来。减小最终的  `.bpf.o` 文件是十分必要的，因为它将通过 BPF skeleton 被嵌入到最后的二进制应用中，所以要避免因为不必要的 DWARF 数据增加它的大小。

既然我们已经生成了一个 `.bpf.o` 文件，`bpftool`可以用来生成一个对应的 BPF skeleton 头文件，即`.skel.h`，是通过`bpftool gen skeleton` 命令完成的：

```makefile
# Generate BPF skeletons
$(OUTPUT)/%.skel.h: $(OUTPUT)/%.bpf.o | $(OUTPUT)
	$(call msg,GEN-SKEL,$@)
	$(Q)$(BPFTOOL) gen skeleton $< > $@
```

通过这种方式，我们确保了无论何时更新 BPF skeleton，用户空间的的应用也会被更新。因为他们需要在编译时将 BPF skeleton 嵌入进去。用户空间的 `.c` → `.o` 编译则是相当直接的：

```makefile
# Build user-space code
$(patsubst %,$(OUTPUT)/%.o,$(APPS)): %.o: %.skel.h

$(OUTPUT)/%.o: %.c $(wildcard %.h) | $(OUTPUT)
	$(call msg,CC,$@)
	$(Q)$(CC) $(CFLAGS) $(INCLUDES) -c $(filter %.c,$^) -o $@
```

最后，只使用用户空间的 `.o` 文件，以及 `libbpf.a` 静态库，就生成了最终的二进制文件。`-lelf` 和 `-lz` 是 libbpf 的依赖，需要显式地提供给编译器：

```makefile
# Build application binary
$(APPS): %: $(OUTPUT)/%.o $(LIBBPF_OBJ) | $(OUTPUT)
	$(call msg,BINARY,$@)
	$(Q)$(CC) $(CFLAGS) $^ -lelf -lz -o $@
```

也就是说，在运行上面几个步骤后，你将会得到一个很小的用户空间的二进制文件。通过 BPF skeleton，编译出的 BPF 代码被嵌入到了这个二进制文件中，静态链接了 libbpf。所以它不再依赖于系统侧全局的 `libbpf`。这个二进制文件仅有 200KB，运行起来很快、可以独立执行，正如 [Brendan Gregg 所述](http://www.brendangregg.com/blog/2020-11-04/bpf-co-re-btf-libbpf.html)。

## Bootstrap app

我们已经介绍了 `minimal` 应用是什么样的，以及是如何编译的，下面我们就看看 `bootstrap` 中显示出的别的 BPF 特性。 `bootstrap` 是我之前写到的，是一个适用于生产环境下的 BPF 应用、它依赖于 BPF CO-RE (read why [here](https://nakryiko.com/posts/bpf-portability-and-co-re/)) 特性，需要 Linux 内核在编译时选择 `CONFIG_DEBUG_INFO_BTF=y` (see [here](https://github.com/libbpf/libbpf#bpf-co-re-compile-once--run-everywhere))。

`bootstrap` 追踪的是 `exec()` 系统调用，使用的是 `SEC("tp/sched/sched_process_exec") handle_exit` BPF 程序，大致上和进程的创建有关（这里忽略掉 `fork()`）。另外，它追踪了 `exit()` 调用，这个是用的 `SEC("tp/sched/sched_process_exit") handle_exit` BPF 程序，来监控每个进程是何时结束的。这两个 BPF 程序，共同协作，允许捕获到每个新建进程的信息，例如二进制文件名，每个进程的生命周期，收集进程消亡时的数据信息，如 exit code 或消耗的资源等。如果你想要看看内核到底在干嘛，它会是一个很好的开始。

`bootstrap` 也用了libc 的部分 [argp API](https://www.gnu.org/software/libc/manual/html_node/Argp.html)  来解析命令行参数，可以参考 ["Step-by-Step into Argp" tutorial](http://download.savannah.nongnu.org/releases-noredirect/argpbook/step-by-step-into-argp.pdf) 来了解这个 库是咋用的。用它我们提供了一些选项给程序，比如可以解析生命周期时长参数，即下面的`min_duration_ns` 只读变量。使用命令 `sudo ./bootstrap -d 100` 来显示最近 100 ms 存活的进程。详细的模式可以用 `sudo ./bootstrap -v`，激活 `libbpf` 调试信息。

### Includes: vmlinux.h, libbpf and app headers

下面是 [bootstrap.bpf.c](https://github.com/libbpf/libbpf-bootstrap/blob/master/src/bootstrap.bpf.c) 导入的头文件：

```c
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>
#include "bootstrap.h"
```

和 `minimal.bpf.c` 不同的是，我们使用了 `vmlinux.h` 头文件，在一个文件中包含了内核中所有的类型。他是 libbpf-bootstrap 项目里 [预先生成的](https://raw.githubusercontent.com/libbpf/libbpf-bootstrap/master/src/vmlinux_508.h) ，但是开发者也可以自己使用 `bpftool` 来生成，具体可以参考 [gen_vmlinux_h.sh](https://github.com/libbpf/libbpf-bootstrap/blob/master/tools/gen_vmlinux_h.sh)。

> `vmlinux.h` 中所有的类型都会携带着额外的标签 `__attribute__((preserve_access_index))`，它会让 Clang 生成具有 [BPF CO-RE relocations](https://nakryiko.com/posts/bpf-portability-and-co-re/#reading-kernel-structure-s-fields),的程序，允许 libbpf 将你的 BPF 代码放到宿主机内核内存的特定位置，即使它和脚手架项目最初生成的那个 `vmlinux.h` 不同。这是构建可迁移的预编译出的 BPF 应用很关键的一步，从而不需要将整个 Clang/LLVM 工具链部署到目标系统上。与之相对的是 BCC 的方法，在运行时编译 BPF 代码，有很多[弊端](https://nakryiko.com/posts/bcc-to-libbpf-howto-guide/#why-libbpf-and-bpf-co-re)。

:::tip

`vmlinux.h` 不能和其他系统侧的内核头文件结合，显然，若是那么干了，你将会碰到重复定义的问题。所以只使用 libbpf 提供的 `vmlinux.h` 头文件就好了。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   

:::

除了 `bpf_helpers.h`，我们也使用了一些其他的 libbpf 提供的头文件，如`bpf_tracing.h` 和 `bpf_core_read.h`，提供了一些额外的宏来写具有 CO-RE 特性的 BPF 应用。最后，`bootstrap.h` 包含了通用的类型定义，在 BPF 和用户空间的代码之间共享。

### BPF maps

> `bootstrap` 展示了 BPF maps 的使用方法，它是 BPF 中的抽象数据结构。许多不同的数据结构都可以被建模为 BPF maps：例如数组、哈希表、per-socket 和 per-task 的本地存储、BPF perf  和 ring buffers，甚至是其他奇特的用法。重要的是大多数 BPF maps 允许执行差序、更新、按照键删除元素等方法。一些 BPF maps 允许额外的操作，比如 [BPF ring buffer](https://nakryiko.com/posts/bpf-ringbuf/)，允许数据入队，但是用于都不从 BPF 侧删除它。BPF maps 是用来在 BPF 程序和用户空间之间共享状态的。另一个起到这种作用的是 BPF 全局变量，它在底层也是用 BPF maps 实现的。

在 `bootstrap` 中，我们定义了名叫 BPF map 的 `exec_start` 的 `BPF_MAP_TYPE_HASH` 类型的哈希表。它最大容纳 8192 个元素，键是 `pid_t` 类型的，值是一个 64 位的无符号整型，存储了进程运行事件的纳秒粒度的时间戳。这就是所谓的 BTF-defined map，`SEC(".maps")` 标注是必要的，让 libbpf 知晓它需要在内核中创建对应的 BPF map，在 BPF 代码中：

```c
struct {
	__uint(type, BPF_MAP_TYPE_HASH);
	__uint(max_entries, 8192);
	__type(key, pid_t);
	__type(value, u64);
} exec_start SEC(".maps");
```

在这样一个哈希表中添加、更新元素是很简单的：

```c
	pid_t pid;
	u64 ts;

	/* remember time exec() was executed for this PID */
	pid = bpf_get_current_pid_tgid() >> 32;
	ts = bpf_ktime_get_ns();
	bpf_map_update_elem(&exec_start, &pid, &ts, BPF_ANY);
```

`bpf_map_update_elem()` BPF helper 接收 map 它自己的指针、键和值的指针，在这个例子中 `BPF_ANY` 表示的是或者添加一个新的键或者更新已有的键值对。

注意第二个 BPF 程序（`handle_exit`）从同一个 BPF map 中查询元素，之后删除它。它展示了 `exec_start` map 是在两个 BPF 程序之间共享的：

```c
	pid_t pid;
	u64 *start_ts;
	...
	start_ts = bpf_map_lookup_elem(&exec_start, &pid);
	if (start_ts)
		duration_ns = bpf_ktime_get_ns() - *start_ts;
	...
	bpf_map_delete_elem(&exec_start, &pid);
```

#### Read-only BPF configuration variables

`bootstrap` 和 `minimal` 不同，使用的是只读的全局变量：

```c
const volatile unsigned long long min_duration_ns = 0;
```

`const volatile` 是重要的，它为 BPF 代码和用户空间的代码标记了只读变量。它具体定义了 `min_duration_ns` 的值，同时在 BPF 程序的验证期间，BPF verifier 是知晓它的。这就允许 BPF verifier 优化无效的代码，也就是这样只读的变量限制下访问不到的代码路径，即减少了不可到达的分支逻辑。这个特性在一些更加高级的用例里是很受欢迎的，例如可移植性的检查和其他配置项。

> `volatile` 是让 Clang 不去优化掉该变量、忽略掉用户空间所提供的值所必要的。否则，Clang 可以自由地移除掉该变量，这不是我们想要的结果。

在用户侧代码 [bootstrap.c](https://github.com/libbpf/libbpf-bootstrap/blob/master/src/bootstrap.c) 中，初始化自由的只读全局变量是有一点点不太一样的。他们需要在 BPF skeleton 被加载到内核前就设置好。所以，不能直接使用一个单步的 `bootstrap_bpf__open_and_load()`。我们需要先使用 `bootstrap_bpf__open()` 来创建 skeleton，然后设置只读变量值，再调用 `bootstrap_bpf__load()` 把 skeleton 加载到内核里：

```c
	/* Load and verify BPF application */
	skel = bootstrap_bpf__open();
	if (!skel) {
		fprintf(stderr, "Failed to open and load BPF skeleton\n");
		return 1;
	}

	/* Parameterize BPF code with minimum duration parameter */
	skel->rodata->min_duration_ns = env.min_duration_ms * 1000000ULL;

	/* Load & verify BPF programs */
	err = bootstrap_bpf__load(skel);
	if (err) {
		fprintf(stderr, "Failed to load and verify BPF skeleton\n");
		goto cleanup;
	}
```

注意只读变量是 skeleton 中 `rodata` 段的一部分，不是 `data` 或 `bss` 段，所以是这么取它的： `skel->rodata->min_duration_ns`。在 BPF skeleton 被加载后，用户空间的的代码只能读取只读变量的值。BPF 代码也只能阅读这些变量。 一旦检测到写只读变量的操作，BPF verifier 将会拒绝 BPF 程序。

### BPF ring buffer

`bootstrap` 大量地使用了 BPF ring buffer map 来准备和发送数据到用户空间。它使用了 `bpf_ringbuf_reserve()`/`bpf_ringbuf_submit()` [combo](https://nakryiko.com/posts/bpf-ringbuf/#bpf-ringbuf-reserve-commit-api) 以获得最佳的可用性和性能，可以阅读 [BPF ring buffer 相关博客](https://nakryiko.com/posts/bpf-ringbuf/) 来深入理解。那篇文章深入探究了相似的内容，解读了另一个独立的分支 [bpf-ringbuf-examples](https://github.com/libbpf/bpf-ringbuf-examples/) 中的例子。它会给你一个很好的例子，帮助你了解如何使用 BPF perf buffer。

### BPF CO-RE

BPF CO-RE (Compile Once – Run Everywhere) 是一个很大的话题， [另有一篇博客](https://nakryiko.com/posts/bpf-portability-and-co-re/) 详细描述了它，可以参阅它去理解。这里有一个来自 `bootstrap.bpf.c` 中的例子，利用了 BPF CO-RE 特性来从内核的结构体 `struct task_struct` 中读取数据：

```c
	e->ppid = BPF_CORE_READ(task, real_parent, tgid);
```

在非 BPF 的世界中，可以很简单地写作 `e->ppid = task->real_parent->tgid;`，但是 BPF verifier 需要付出额外的努力，因为任意地去内核内存是存在风险的。 `BPF_CORE_READ()` 就用了一个简洁的方式处理这个问题，它在读取指针对应位置的过程中，记录了 BPF CO-RE 重定位带来的地址偏移，允许 libbpf 将所有字段偏移量调整到宿主机器内核的特定内存布局上。可以参考 [这篇博客](https://nakryiko.com/posts/bpf-portability-and-co-re/#reading-kernel-structure-s-fields) 来深入了解。

## Conclusion

这篇文章大概囊括了 `libbpf-bootstrap` 和 BPF/libbpf 的方方面面。希望 `libbpf-bootstrap` 让你度过 BPF 开发的起步阶段，避免配置环境的痛苦，让你的时间更多地用在 BPF 本身上。对于更有经验的 BPF 开发者，这篇文章应该已经揭示了 BPF 在可用性方面的提升，如 BPF skeleton、BPF ringbuf、BPF CO-RE，以防你没有紧密地追踪 BPF 的最新进展。

## 补充 BPF Map 相关内容

该部分内容来自本博客之前引用过的一篇文章，[原文链接](https://blog.csdn.net/sinat_38816924/article/details/115607570) 。作者是阅读了 [Linux Observability with BPF](https://www.oreilly.com/library/view/linux-observability-with/9781492050193/) 这本书做的笔记，这本书的电子版在 [Z-Library](https://z-lib.org/) 上能找到。

消息传递来唤醒程序的行为，在软件工程中很常见。一个程序可以通过发送消息来修改另一个程序的行为；这也允许这些程序之间交换信息。关于 BPF 最吸引人的一个方面是，运行在内核上的代码和加载所述代码的用户空间程序可以在运行时使用消息传递相互通信。BPF maps 用来实现此功能。BPF maps 是驻留在内核中的键/值存储。任何知道它们的 BPF 程序都可以访问它们。在用户空间中运行的程序也可以使用文件描述符访问这些映射。只要事先正确指定数据大小，就可以在 maps 中存储任何类型的数据。

### 使用BPF系统调用操作 BPF maps

bpf 系统调用的原型如下：

```c
#include <linux/bpf.h>
int bpf(int cmd, union bpf_attr *attr, unsigned int size);
```

例如创建一个 hash-table map。其中key和value都是无符号整形。

```c
union bpf_attr my_map {
    .map_type = BPF_MAP_TYPE_HASH,
    .key_size = sizeof(int),
    .value_size = sizeof(int),
    .max_entries = 100,
    .map_flags = BPF_F_NO_PREALLOC,
};
int fd = bpf(BPF_MAP_CREATE, &my_map, sizeof(my_map));
```

### 使用 BPF helper 创建BPF maps
helper函数bpf_map_create包装了刚才看到的代码，以便更容易根据需要初始化映射。我们可以使用它创建上一个map，只需一行代码：

```c
int fd;
fd = bpf_create_map(BPF_MAP_TYPE_HASH, sizeof(int), sizeof(int), 100,BPF_F_NO_PREALOC);
```

如果是将要加载到内核的代码，也可以如下这样创建map。创建原理是：`bpf_load.c` 扫描目标文件时候，解析到 maps section，会通过 bpf syscall 创建 maps。

```c
struct bpf_map_def SEC("maps") my_map = {
    .type = BPF_MAP_TYPE_HASH,
    .key_size = sizeof(int),
    .value_size = sizeof(int),
    .max_entries = 100,
    .map_flags = BPF_F_NO_PREALLOC,
};
```

用户空间的程序，调用 `load_bpf_file` 函数，将 `bpf` 程序加载的内核。`load_bpf_file` 会扫描 bpf 程序（elf 格式）的各个 section。对于名为 maps 的 section，`load_bpf_file` 会从中提取出maps的信息，并调用 `syscall(__NR_bpf, 0, attr, size);` 系统调用，创建map。

### Working with BFP Maps
内核和用户空间之间的通信将是您编写的每个BPF程序的一个基本部分。给内核编写代码时访问 map 的 api 与给用户空间程序编写代码不同。对于 `bpf_map_update_elem` 这个程序：运行在内核的代码从 `bpf_helpers.h` 加载；运行在用户空间的代码从`tools/lib/bpf/bpf.h` 加载；这样区分的原因是，内核空间可以直接访问 maps；而用户空间访问 maps 需要通过文件描述符。在内核上运行，可以在原子方式更新元素。在用户空间运行的代码，内核需要复制值以用于更新 map。这个非原子操作，可能失败。如果失败，失败原因填充到全局变量 errno 中。

对于5.4内核源码 bpf_helpers.h 的位置如下：

```bash
find . -name "bpf_helpers.h"
# tools/testing/selftests/bpf/bpf_helpers.h
```

### 更新元素
我们先看从内核中更新map的函数。

```c
// tools/testing/selftests/bpf/bpf_helpers.h
static int (*bpf_map_update_elem)(void *map, const void *key, const void *value,
				  unsigned long long flags) =
	(void *) BPF_FUNC_map_update_elem;
// #define BPF_FUNC_map_update_elem 2
```

内核中出现这些奇奇怪怪的数字很正常。我暂时不知道这个2是什么鬼。

内核中的 bpf_map_update_elem 函数有四个参数。第一个是指向我们已经定义的 map 的指针。第二个是指向要更新的键的指针。因为内核不知道我们要更新的键的类型，所以这个方法被定义为指向 void 的不透明指针，这意味着我们可以传递任何数据。第三个参数是我们要插入的值。此参数使用与键参数相同的语义。我们在本书中展示了一些如何利用不透明指针的高级示例。您可以使用此函数中的第四个参数来更改map的更新方式。此参数可以采用三个值：

如果传递0，则告诉内核如果元素存在，则要更新该元素；如果元素不存在，则要在映射中创建该元素。[0 可以用 BPF_ANY 宏表示]
如果传递1，则告诉内核仅在元素不存在时创建该元素。[1 可以用 BPF_NOEXIST 宏表示]
如果传递2，内核将只在元素存在时更新它。[2 可以用 BPF_EXIST 宏表示]

也可以从用户空间程序中更新 map。执行此操作的帮助程序与我们刚才看到的类似；唯一的区别是，它们使用文件描述符访问 map，而不是直接使用指向 map 的指针。正如您所记得的，用户空间程序总是使用文件描述符访问 map。

```c
// tools/lib/bpf/bpf.h
#ifndef LIBBPF_API
#define LIBBPF_API __attribute__((visibility("default")))
#endif
LIBBPF_API int bpf_map_update_elem(int fd, const void *key, const void *value,
				   __u64 flags);
```

这里的fd获取方式有两种。第一中，是使用 bpf_create_map 函数返回的 fd。也可以通过全局变量 map_fd 访问。

### 读取元素
`bpf_map_lookup_elem`：从 map 中读取内容。同样，也分为内核空间和用户空间两种形式。

```c
// 内核空间
// tools/testing/selftests/bpf/bpf_helpers.h
static void *(*bpf_map_lookup_elem)(void *map, const void *key) =
	(void *) BPF_FUNC_map_lookup_elem;
//#define BPF_FUNC_map_lookup_elem 1
```

```c
// 用户空间
// tools/lib/bpf/bpf.h
#ifndef LIBBPF_API
#define LIBBPF_API __attribute__((visibility("default")))
#endif
LIBBPF_API int bpf_map_lookup_elem(int fd, const void *key, void *value);
```

它们的第一个参数也有所不同；内核方法引用映射，而用户空间帮助程序将映射的文件描述符标识符作为其第一个参数。第三个参数是指向代码中要存储从映射中读取的值的变量的指针。

### 删除元素
同样有两种：运行在用户空间，运行在内核空间。如果删除的 key 不存在，返回一个负数；error 被设置成 ENOENT。

```c
static int (*bpf_map_delete_elem)(void *map, const void *key) =
	(void *) BPF_FUNC_map_delete_elem;
```

```c
LIBBPF_API int bpf_map_delete_elem(int fd, const void *key);
```

### 迭代遍历元素
bpf_map_get_next_key，此指令仅适用于在用户空间上运行的程序。

```c
LIBBPF_API int bpf_map_get_next_key(int fd, const void *key, void *next_key);
```

第一个参数：map 的文件描述符。第二个参数：lookup_key，你希望查找的属性值对应的 key。第三个参数：next_key，map 中的 next key。

当您调用这个帮助程序时，BPF 会尝试在这个 map 中找到作为查找键传递的键的元素；然后，它会用映射中相邻的键设置下一个next_key 参数。因此，如果您想知道哪个键在键 1 之后，您需要将 1 设置为 lookup_key，BPF 会将与之相邻的 key 设置为下一个next_key 参数的值。

如果要打印映射中的所有值，可以使用 bpf_map_get_next_key 键和映射中不存在的查找键。这将强制 BPF 从地图的开头开始。

当 bpf_map_get_next_key 到达 map 的末尾时候，返回一个负数，errno 值被设置成 ENOENT。

您可以想象，bpf_map_get_next_key 可以从地图中的任何一点开始查找 key；如果您只希望另一个特定 key 的下一个 key，则不需要从map 的开头开始。

另外，我们还需要知道 bpf_map_get_next_key 的另一个行为。许多编程语言会在迭代遍历之前，复制 map。因为遍历的时候，如果有代码删除将要遍历的元素，将会很危险。bpf_map_get_next_key 遍历的时候，没有复制 map。如果遍历的时候，map 中存在元素被删除，bpf_map_get_next_key 会自动跳过它。

### 查找删除元素
bpf_map_lookup_and_delete_elem：一个元素通过 key 进行搜索。搜索到之后，删除这个元素，同时将元素的值放在 value 中。这个也是仅仅适用于用户空间。

```c
LIBBPF_API int bpf_map_lookup_and_delete_elem(int fd, const void *key,void *value);
```

### 并发访问 map
使用 BPF 映射的挑战之一是许多程序可以同时访问相同的映射。这会在我们的 BPF 程序中引入竞争条件。为了防止竞争情况，BPF 引入了 BPF 自旋锁的概念，它允许您在对 map 元素进行操作时锁定对 map 元素的访问。自旋锁仅适用于 array、hash 和 cgroup 存 maps。

```c
// 信号量
// /usr/include/linux
struct bpf_spin_lock {
	__u32	val;
};

// 内核
// 加锁+解锁
// tools/testing/selftests/bpf/bpf_helpers.h
static void (*bpf_spin_lock)(struct bpf_spin_lock *lock) =
	(void *) BPF_FUNC_spin_lock;
static void (*bpf_spin_unlock)(struct bpf_spin_lock *lock) =
	(void *) BPF_FUNC_spin_unlock;
```

我这里复制下书上的事例。这个访问控制，精度比较细。对每一个元素使用了自旋锁。另外这个 map 必须用 BPF 类型格式（BPF Type Format, BTF）注释，这样 verifier 就知道如何解释这个结构。类型格式通过向二进制对象添加调试信息，使内核和其他工具对BPF数据结构有了更丰富的理解。

```c
struct concurrent_element {
    struct bpf_spin_lock semaphore;
    int count;
}

struct bpf_map_def SEC("maps") concurrent_map = {
    .type = BPF_MAP_TYPE_HASH,
    .key_size = sizeof(int),
    .value_size = sizeof(struct concurrent_element),
    .max_entries = 100,
};

BPF_ANNOTATE_KV_PAIR(concurrent_map, int, struct concurrent_element);

int bpf_program(struct pt_regs *ctx) {
	int key = 0;
    struct concurrent_element init_value = {};
    struct concurrent_element *read_value;
    bpf_map_create_elem(&concurrent_map, &key, &init_value, BPF_NOEXIST);
    read_value = bpf_map_lookup_elem(&concurrent_map, &key);
    bpf_spin_lock(&read_value->semaphore);
    read_value->count += 100;
    bpf_spin_unlock(&read_value->semaphore);
}
```

用户空间更改 map 的话，使用 `bpf_map_update_elem` 和 `bpf_map_lookup_elem_flags` 的时候，添加 `BPF_F_LOCK` flags。


