---
title: WebAssembly in Envoy
description: 为 Sentinel-Rust 增加 Envoy 插件做的调研
tags: 
- Rust
- 云原生
- WASM
- Sentinel
---

[[toc]]

# WebAssembly in Envoy

Sentinel-Golang 最近在筹划添加 Envoy Wasm 拓展，Rust 也常常被用来做 Wasm 相关的开发，本着学习的想法进行了调研。调研后发现不仅 Proxy-Wasm 团队有提供 [Rust SDK](https://github.com/proxy-Wasm/proxy-Wasm-rust-sdk)，也有一个针对 Envoy 的在 Proxy-Wasm 之上二次开发的 [SDK](https://github.com/tetratelabs/envoy-Wasm-rust-sdk/)。目前 Sentinel-Rust 下的 `example/proxy/envoy` 下提供了一个结合 Envoy 的简单的样例，目前还没有提供任何包装。


## 翻译 [Proxy-Wasm Spec](https://github.com/proxy-Wasm/spec/blob/master/docs/WebAssembly-in-Envoy.md)

两年前发布的 sepc，不知道有多少内容发生了变化。

### 背景

在 2019 年的时候，Envoy 只能静态编译使用，所有拓展就是在构建时候就要编译进来的。这也就意味着：提供了自定义的拓展的项目，例如 Istio，必须维护、分发他们自己的二进制文件，而不是使用官方的未修改过的 Envoy。

对于不能控制他们的部署的项目来说，问题更加棘手，因为任何对拓展的更新或 bug 的修复都需要构建出整个项目、发版、分发下去，在生产环境中重新部署。这也意味着经常要在已经部署的拓展和控制平面的配置间做版本的迁移。

### 解决方案

虽然上面提到的问题可以通过动态加载的 C++ 拓展来解决一部分，但是由于 Envoy 的快速发展，并没有稳定的 ABI，甚至是 API，提供给拓展，更新 Envoy 又往往需要代码的更改，导致更新非常依赖于人工。使用 WebAssembly 编写的拓展就会简单很多了，而且它还有很多其他优势。

### 什么是 WebAssembly？

WebAssembly (Wasm) 是一个面向未来的可移植的可执行的二进制文件格式。代码几乎在原生的速度下在（对宿主）内存安全的沙箱中执行，显式定义了对资源的限制和与宿主环境（例如，proxy）交流的 API。

### 优势

- **灵活性**。拓展可以在运行时直接从控制平面分发和加载。这不仅意味着每个人都可以使用官方的无修改的代理、加载自定义的拓展，也意味着任何更新或 bug 的修复能在运行时推送或测试，不需要更新或重新部署一个新的二进制文件。
- **可靠性和隔离性**。因为拓展都是部署在一个沙箱里的，他们出现内存错误或泄露了内存并不会影响到整个 proxy。另外，可以对沙箱的 CPU 和内存等资源的使用做限制。
- **安全**。因为拓展是部署在明确定义了 API 的沙箱中的，只和 proxy 交互。他们只能获取和修改连接或请求的部分属性。另外，因为 proxy 在协调这些连接或请求，它可以选择隐藏、审查来自插件的敏感信息，例如 “Authorization” 和 “Cookie” HTTP headers，或是用户的 IP 地址。
- **多样性**。有超过 30 种语言可以被编译成 WebAssembly 模块，允许各种背景的开发者编写 Proxy-Wasm 拓展。
- **可维护**。由于拓展是用标准库写的，独立于 proxy 的代码，可以提供稳定的 ABI。
- **可移植性**。由于宿主环境和拓展的交互是无视 proxy 的。使用 Proxy-Wasm 写的拓展可以在各种各样的 proxies 种执行，例如 Envoy、NGINX、ATS 或者甚至是在 gRPC 库中执行。

### 缺陷

- 高额的内存消耗，因为需要开启多个虚拟机，每个都有它自己的内存块。
- 由于需要向沙箱内和向沙箱外拷贝大量报文数据，对报文进行解析的拓展的性能或低一些。
- CPU 密集的拓展性能较差，和原生代码相比会至多变慢两倍。
- 增加了二进制文件的大小，因为要把 Wasm 的运行时也打包进去，WAVM 大概要 20MB，V8 大概要 10MB。
- Wasm 的生态才刚刚起步，开发大部分集中于浏览器端的支持，JavaScript 会是考虑的宿主环境。

### 概述

通过Proxy-Wasm，开发者可以使用他们选择的编程语言编写代理扩展，最好是使用我们提供的特定语言库。然后，这些扩展被编译成可移植的 Wasm 模块，并以该格式发布。

在 Proxy 侧，一旦 Wasm 模块被加载（直接从磁盘或通过 xDS 从控制平面推送），它将被验证是否符合定义的 Proxy-Wasm 接口，并使用 Proxy 中嵌入的 Wasm 运行时进行实例化，它在每个工作线程中创建一个新的 Wasm 虚拟机。

对于Envoy的每一种扩展类型，我们都创建了一个 shim 层，将扩展的接口转换为 Proxy-Wasm 的调用，因此这些接口与原生的（C++）Envoy 扩展中使用的接口非常相似，都是采用事件驱动的编程模型。

![](./WebAssembly-in-Envoy.svg)

### 运行时

为了执行 Proxy-Wasm 拓展，proxy 需要内置一个运行时，可以在沙箱中执行代码。目前有两个 C 或 C++ Wasm 运行时：基于 LLVM 的WAVM 和 V8。Envoy 同时包含 WAVM 和 V8 两个，我们在配置时可以选择。

### 虚拟机

当Wasm运行时实例化一个Wasm模块，它为它创建一个Wasm虚拟机（VM实例）。

在虚拟机实例和Proxy-Wasm扩展之间有几种映射模型。归根结底，这是一种权衡：启动延迟和资源使用，以及隔离和安全。

- **Persistent in-process VM per worker thread per Wasm module (shared across multiple configured uses of Wasm extension)**. A single Wasm module can contain multiple extensions (e.g. listener filter and transport socket, both in a single package). For each Wasm module, a single persistent in-process VM instance is created, and it can (but doesn’t have to) be shared by all Proxy-Wasm extensions referencing that Wasm module in the configuration.
- **Persistent in-process VM per worker thread per Wasm extension**. A single persistent in-process VM instance is created for each Wasm extension and it’s shared by all Proxy-Wasm extensions referencing the given Wasm module in the configuration, similarly to how the native (C++) extensions are instantiated today.
- **Persistent in-process VM per worker thread per configured use of Wasm extension**. A single persistent in-process VM instance is created for each configured use of a Proxy-Wasm extension referencing given Wasm module in the configuration. This model provides stronger isolation guarantees than the previous models, and it should be preferred in the multi-tenant environments.
- **Ephemeral (per request) in-process VM**. A new ephemeral in-process VM instance is created for each request, for each Proxy-Wasm extension, and it’s destroyed immediately after the request is finished. This is expected to be prohibitively expensive.
- **Out-of-process VM**. This is out of scope for this document, but for deployments loading untrusted (and potentially malicious) Wasm modules in multi-tenant environments, that require strong security guarantees and want to protect against Spectre-like attacks, proxy should communicate with an out-of-process Wasm sandbox (e.g. using Filters-over-gRPC or shared memory) that implements Proxy-Wasm, which would execute Wasm modules on its behalf and stream results back to the proxy.

### 宿主环境

沙盒 Wasm 虚拟机使用明确定义的接口与宿主环境（即 proxy）进行通信，其中包括：从 Wasm 模块导出的、代理可以调用的函数，Wasm 虚拟机可以调用的辅助函数，以及用于内存管理的 Wasm 函数。

因为这个接口是非常底层的和相当稳定的，它允许我们定义一个稳定的ABI（函数原型将在一个单独的文件中定义），扩展可以使用它。

### Control Plane (xDS) 集成

Proxy-Wasm 扩展可以通过使用 Envoy 的 `Config::DataSource` 在配置中引用它们来加载，它可以指向磁盘上的文件或包含从控制平面（xDS）发送的内联Wasm模块。我们正在扩展这个接口，以支持从HTTP服务器获取资源。由于加载的Wasm模块将被执行，强烈建议加强检查，如SHA256校验和，或数字签名的扩展。

### 错误检测和报告

在 Wasm 虚拟机崩溃的情况下（例如，由于 Wasm 扩展中的错误），代理应该创建一个新的虚拟机实例，记录关于崩溃的信息，并将其暴露给外部系统（例如，使用统计），以便控制平面可以根据这些信息采取行动。

理想情况下，代理还应该跟踪崩溃的数量，当达到一个极限时，它应该停止重新启动Wasm VM（以防止进入崩溃循环），并开始拒绝连接和/或返回错误给客户。

### 可配置的资源限制

每个配置的 Proxy-Wasm 扩展可以设置资源限制（每个虚拟机可以分配的最大内存，以及每次调用时可以消耗的最大CPU时间），以限制资源的使用。

### 可配置的 API 限制

对于每个配置的 Proxy-Wasm 扩展，可用的 API 列表可以被限制，因此，只计算的扩展（如压缩）将无法访问他们不需要的 API（如HTTP/gRPC 侧调用）。

此外，一些 API 可以对输入和/或输出进行审查（例如，删除返回的首部的属性，或限制 HTTP/gRPC 侧调用的主机列表）。

## 相关示例

开头提到的两个 SDK 的示例：

[Proxy-Wasm Rust SDK](https://github.com/proxy-Wasm/proxy-Wasm-rust-sdk)

[Proxy-Wasm Envoy SDK](https://github.com/tetratelabs/envoy-Wasm-rust-sdk/)

其他博客示例：

[Extending Envoy with Wasm and Rust](https://antweiss.com/blog/extending-envoy-with-Wasm-and-rust/)

[Extending Istio with Rust and WebAssembly](https://blog.red-badger.com/extending-istio-with-rust-and-webassembly)


## 一点碎碎念

前段时间课题研究看了一段时间 eBPF 和它的虚拟机的移植，最近再来看 Wasm，感觉理解起来快了不少。之前只知道 Wasm 在浏览器端貌似非常成功，今天才知道它的虚拟机结合到了 Envoy 代理中提供非侵入式的插件功能，这实际上和 eBPF/XDP 之于 Linux 内核的角色类似。之前看了 CNCF 会的一则 [演讲](https://www.youtube.com/watch?v=99jUcLt3rSk)，演讲者预言："未来十年的 Linux 属于 eBPF"；希望能看到更多 Wasm 引导的技术上的进步。 

回想搁置掉的 eBPF 虚拟机课题，又在考虑它的实际应用场景。有看到过一些类似工作：往 Sel4 上移植 Wasm 虚拟机的小项目、在嵌入式平台移植 $\mu$-JVM 的 RTOS 论文，但是似乎都是隔靴搔痒。为什么要移植这个虚拟机而不是另一个，到底优势在哪里，适用的场景是什么，还是很难去考量的。

今天是 2022 年的新一天，希望新年里自己也能保持学习，莫要年末感叹马齿徒增。

## 最近的进展

### 一个简单的 Envoy Wasm 插件示例

之前读了上面提到的利用 proxy-wasm 在 Envoy 里实现一个简单的插件的博客 [Extending Envoy with Wasm and Rust](https://antweiss.com/blog/extending-envoy-with-Wasm-and-rust/)，实际部署了一下，作者原始的 demo 项目有些依赖比较老了，现在 Envoy 官方的镜像已经可以正常使用了，稳定版 Rust 工具链也可以正常编译出 wasm 字节码，所以重新调试后发布在这个[项目](https://github.com/Forsworns/proxy-wasm-rust)。

### 多线程方面的探索调研

有了三面那个插件的 demo。我在 Sentinel-Rust 中也尝试了向 WASM target 平台的编译，折腾了半天倒是编译成功了。但是却始终无法集成到上面的 demo 中。一方面是 Sentinel 在实现的时候启动了大量的线程，但是 Wasm 的运行时是单线程的；另一方面是 proxy-wasm 的简洁来源于网关那边暴露的接口，抛开这些标准的接口，向网关的 wasm 插件中添加支持 Wasm 的一些 crate，例如 `rand`, `uuid` 都十分困难，和浏览器端使用 `wasm-pack` 直接打包又不同。

浏览器端 wasm 是可以使用多线程的，在转换成 js 的时候可以使用 Web Worker 和 SharedArrayBuffer：

- [wasm-mt](https://github.com/w3reality/wasm-mt) 封装了创建 Worker 的过程。

- [wasm-bindgen-rayon](https://github.com/GoogleChromeLabs/wasm-bindgen-rayon) 同样通过 Worker 实现了对 `rayon` 的支持。

- [Parallel Raytracing](https://rustwasm.github.io/wasm-bindgen/examples/raytrace.html) 中 `wasm-bindgen` 提供了直接使用 Worker 自己封装一个线程池的示例，用了一个 Rust 实现的光追算法构建了 Web 应用。

### 文件读写方面的探索调研

直接把 Sentinel-Rust 集成到 prxoy-wasm 的 demo 里编译成 wasm 字节码再插入到 Envoy 中估计是走不通了。和小伙伴讨论了一下有没有什么曲线救国的办法，提到了想一想进程间通信的方法，像共享内存、MQ、套接字这些。

但是很可惜，由于 wasm 本身在封闭沙箱里运行有自己独立的内存地址空间（是一个简单的单地址空间）、不支持多线程、网络通讯是由 host 提供的（参见 [WebAssembly/design/#1251](https://github.com/WebAssembly/design/issues/1251)）原因，在 Envoy 里嵌入的运行时应该都做不到，浏览器或者 `wasmtime` 这种可能还可行。

由于感觉和 eBPF 很相似，考虑有没有像 eBPF/XDP 的 `pin/unpin` 特殊文件一样：在 prxoy-wasm 的程序里，收到流量就去写一个文件，在另一个进程里去读这个文件并创建 Sentinel，查了一下，果然是有这样的机制，可以参考

- [StackOverflow QA](https://stackoverflow.com/questions/45535301/can-i-read-files-from-the-disk-by-using-webassembly)

- [Emscripten 的示例](https://github.com/emscripten-core/emscripten/blob/main/tests/asmfs/fopen_write.cpp)

但是看上去要用 Emscripten 的 emmc，生成 js 代码，估计和浏览器端的 wasm 多线程一样又是依赖于 js 的一些 feature，用 cargo 生成 wasm 字节码不知道咋样，可能需要去看看 [WASI Standard](https://wasi.dev/) 。

但是就算可以跑通，又有别的问题，这个文件是否可以映射到内存去（比如有可能使用 `mmap` 调用）、怎么在进程间同步（类 AOF 文件似乎也不太合适，清理起过期的数据也困难）。

## Sentinel-Rust 相关资源

[使用指南](https://github.com/sentinel-group/sentinel-rust/wiki)
[ API 文档](https://docs.rs/sentinel-core/latest/sentinel_core/)
[示例代码](https://github.com/sentinel-group/sentinel-rust/tree/main/examples)

