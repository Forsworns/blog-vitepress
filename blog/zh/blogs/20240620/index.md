---
title: Rust libc::fork 与 std::process::Command 混用出的僵尸进程问题
description: 忽略了子进程继承父进程的 stdio fd 导致的问题
tags: 
- unix 
---

[[toc]]

TL;DR
> 守护进程应该参考 [nvidia-persistenced](https://github.com/NVIDIA/nvidia-persistenced/blob/a17da42d9f5e0db228e9e95eb604fad4f06f8a5f/nvidia-persistenced.c#L740) 去写

我有一个命令行应用，想要实现成守护进程，是这么写的

```rust
use nix::unistd::{ForkResult, fork};

fn main() {
	match unsafe { fork() } {
		Ok(ForkResult::Parent { child, .. }) => {
			// 进程A，没有去调用 wait 等待子进程 B；
			// A 进程等待到 B 启动后退出
		}
		Ok(ForkResult::Child) => {
			// A fork 出的进程 B，未被 wait，成为孤儿进程；
			// 启动一个 server，死循环不退出
		}
	}
}
```

另外有一个 rust 编写的进程 C 去运行这个应用，它的实现和对应的现象是：
在进程 C 中 systemd 启动上述应用的服务，一切正常；
但是在没有 systemd 的环境下，进程 C 中会直接调用 `std::process::Command` 上述应用，调用了 `std::process::Command::output()` 等待应用退出。但是此时整个 C 进程就卡在了这里。此时通过 ps 命令可以查到，A 变成了一个僵尸进程。

换了一下进程 C 中的实现，发现调用 `std::process::Child::wait()` 就没问题了，`std::process::Child::wait_with_output()` 则会出现上面的现象。

阅读一下该方法的实现，可以发现它会先尝试读取 stdio 的 stdout 和 stderr，再进行 wait。于是这里 C 进程卡住的原因就是 A 进程的子进程 B 继承了 A 的 stdio fd，

https://github.com/rust-lang/rust/blob/1d96de2a20e963abb8923dfa3c6175517dfb9d2c/library/std/src/sys_common/process.rs#L136

```rust
pub fn wait_with_output(
    mut process: Process,
    mut pipes: StdioPipes,
) -> io::Result<(ExitStatus, Vec<u8>, Vec<u8>)> {
    drop(pipes.stdin.take());

    let (mut stdout, mut stderr) = (Vec::new(), Vec::new());
    match (pipes.stdout.take(), pipes.stderr.take()) {
        (None, None) => {}
        (Some(out), None) => {
            let res = out.read_to_end(&mut stdout);
            res.unwrap();
        }
        (None, Some(err)) => {
            let res = err.read_to_end(&mut stderr);
            res.unwrap();
        }
        (Some(out), Some(err)) => {
            let res = read2(out, &mut stdout, err, &mut stderr);
            res.unwrap();
        }
    }

    let status = process.wait()?;
    Ok((status, stdout, stderr))
}
```

所以需要 close 关闭或 dup 重定向之前的 fd。

```rust
use nix::unistd::{ForkResult, fork};

fn dup_std_fds() {
    let dev_null = std::fs::File::open("/dev/null").expect("Failed to open /dev/null");
    let dev_null_fd = dev_null.as_raw_fd();

    for &fd in &[libc::STDIN_FILENO, libc::STDOUT_FILENO, libc::STDERR_FILENO] {
        let _ = unsafe { libc::dup2(dev_null_fd, fd) };
    }
}

fn main() {
	match unsafe { fork() } {
		Ok(ForkResult::Parent { child, .. }) => {
			// 进程A，没有去 wait 子进程 B
		}
		Ok(ForkResult::Child) => {
			// A fork 出的进程 B，让它成为孤儿进程
		}
	}
}
```



