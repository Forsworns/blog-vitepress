---
title: Sentinel 结合 eBPF 的探索
description: 一则使用 Sentinel 做基于 eBPF 的流量控制的例子
tags: 
- Rust
- bpf
- xdp
- Sentinel
---

[[toc]]

# Sentinel 结合 eBPF 的探索

[Sentinel](https://github.com/alibaba/Sentinel) 是一款面向微服务的高可用流控防护组件；eBPF 程序，以 [XDP](https://forsworns.github.io/zh/blogs/20210715/) 为例，可以尽早地对网络包进行丢弃，减少进入协议栈的包数。

本文将探索 [Sentinel-Rust](https://github.com/sentinel-group/sentinel-rust) 与 eBPF 的结合，在这个例子中，我们将端口抽象成 Sentinel 中的资源进行统一管理，根据对应资源（端口） Sentinel 的创建情况在 XDP 中丢弃包。eBPF 程序的编写基于 [redbpf](https://github.com/foniod/redbpf) 库。

## 内核 XDP 程序

在 [内核程序](https://github1s.com/sentinel-group/sentinel-rust/blob/HEAD/examples/ebpf/probes/src/port/main.rs) 中创建两个 eBPF map，用来做用户态 Sentinel 创建程序和内核中的 XDP 程序的通讯。`port_events` 记录的是某个端口接收到了包这一事件，而 `port_blocked` 则是一个数组，它的下标对应端口号。

```rust
#[map]
static mut port_events: PerfMap<PortEvent> = PerfMap::with_max_entries(1024);
#[map]
static mut port_blocked: Array<bool> = Array::with_max_entries(1 << 16);
```

接下来编写一个简单的 XDP 程序，我们只检测接收到的包的目的端口号，触发一个事件提交到 `port_events` 中，该事件会在用户态程序中被捕获到；XDP程序会检测 `port_blocked` 中 Sentinel 是否创建失败了，如果 Sentinel 创建失败，那么可能是由于该端口的 QPS 过高，因此可以直接丢弃掉该包。

```rust
#[xdp]
pub fn block_port(ctx: XdpContext) -> XdpResult {
    if let Ok(transport) = ctx.transport() {
        let port = transport.dest();
        let event = MapData::new(PortEvent { port });
        unsafe { port_events.insert(&ctx, &event) };
        // the mmapped memory port_blocked not sync between kernel and userspace
        let blocked = unsafe { port_blocked.get(port as u32) };
        if let Some(&blocked) = blocked {
            if blocked {
                return Ok(XdpAction::Drop);
            }
        }
    }
    Ok(XdpAction::Pass)
}
```

## 用户态 Sentinel 程序

在 [用户态](https://github1s.com/sentinel-group/sentinel-rust/blob/HEAD/examples/ebpf/userspace/src/port.rs)，我们首先完成 Sentinel 的初始化程序，之后加载 XDP 程序并将它注入到某个网卡上（示例中选择了 `lo`）。之后我们加载 Sentinel 的流控规则。这里我们设置名为 `port:8000` 的资源的 QPS 的阈值为 1.0，即每秒仅能有一个该资源被创建。

```rust
flow::load_rules(vec![Arc::new(flow::Rule {
    resource: "port:8000".into(),
    threshold: 1.0,
    calculate_strategy: flow::CalculateStrategy::Direct,
    control_strategy: flow::ControlStrategy::Reject,
    ..Default::default()
})]);
```

完成上述初始化后，我们监听 MPSC 的 event 队列。当检测到 `port_events` 中的事件时，我们使用 `port:{}` 的命名格式去构建 Sentinel，当构建成功/失败时，更改 `port_blocked` 的状态以便指导 XDP 程序。

```rust
while let Some((map_name, events)) = loaded.events.next().await {
    let port_blocked_map = loaded.map("port_blocked").unwrap();
    let port_blocked =
    Array::<bool>::new(port_blocked_map).unwrap();
    for event in events {
        match map_name.as_str() {
            "port_events" => {
                let event = unsafe { std::ptr::read(event.as_ptr() as *const PortEvent) };
                let entry_builder = EntryBuilder::new(format!("port:{}", event.port))
                .with_traffic_type(base::TrafficType::Inbound);
                if let Ok(entry) = entry_builder.build() {
                    port_blocked
                    .set(event.port as u32, false)
                    .unwrap();
                    entry.exit()
                } else {
                    port_blocked
                    .set(event.port as u32, true)
                    .unwrap();
                }
            }
            _ => panic!("unexpected event"),
        }
    }
}
```

## 思考

当然这里有一个问题：用户态的 Sentinel 创建程序和内核中的 XDP 程序对 `port_blocked` 这个 ebpf map 的读写是不同步的，这在初始化时尤为明显。例如将 Sentinel 的规则设置为禁止 `8000` 端口的所有流量，即 `threshold` 设置为 0，仍然可以完成第一次请求。

是否可以去做同步呢？一般来讲，eBPF 一定是非阻塞的程序，也可以说是原子的。LWN 的 [一篇文章](https://lwn.net/Articles/825415/) 介绍了 `BPF_PROG_TYPE_LSM` 和 `BPF_PROG_TYPE_LSM` 两类 eBPF 程序中的标志 `BPF_F_SLEEPABLE`。即使是我们有某种同步手段，阻塞 XDP 的执行似乎仍然不是一个明智的选择。

## Sentinel-Rust 相关资源

[使用指南](https://github.com/sentinel-group/sentinel-rust/wiki)
[ API 文档](https://docs.rs/sentinel-core/latest/sentinel_core/)
[示例代码](https://github.com/sentinel-group/sentinel-rust/tree/main/examples)

