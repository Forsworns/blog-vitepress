---
title: 学习rCore
description: 参考rCore教程用Rust写一个简单的内核
tags: 
- Rust
---

# 学习rCore

[[toc]]

之前花了好长时间去读[The Rust Programming Language](https://doc.rust-lang.org/book/#the-rust-programming-language)，写了写书里的实例，也在LeetCode上用Rust[写了一些题](https://github.com/Forsworns/OJ_Diary)，但是一直没有动手做一个项目。

最近发现同学在github上点赞了rCore项目，再次感叹人与人的差距，这就是强者的os课设么。网抑云，启动！我os课设计当时写的是调度器，现在想起来能跑起来都是一件神奇的事情。当时也没有记笔记的习惯，现在基本忘光了，这次就边学习边记录一下，内容基本都来源于[rCore的教程](https://rcore-os.github.io/rCore_tutorial_doc/)。也算激励自己学习（狒狒14太好玩了不想写代码了orz）。

## 第一章 独立可执行程序

- 使用nightly的Rust需要指定版本确保[ABI](https://stackoverflow.com/questions/2171177/what-is-an-application-binary-interface-abi/2456882)稳定性，需要在工作目录下建一个名为 `rust-toolchain` 的文件，写入如`nightly-2020-01-27`的工具链版本。

- `rustup show`或`rustc --version`查看Rust版本。

- `cargo new --bin`和`cargo new --lib`分别创建binary和library项目。

- 使用`#![no_std]`禁用标准库，这类宏只能置于文件头部；之后需要实现错误处理，使用宏`#[panic_handler]`并实现`panic`函数。

- 在`Cargo.toml`中禁用exception handling

  ```toml
  [profile.dev] # cargo build
  panic = "abort"
  
  [profile.release] # cargo build --release
  panic = "abort"
  ```

- 移除runtime system（链接到标准库的rust程序会先跳转到 C runtime library 中的 **crt0(C runtime zero)** 进入 C runtime 设置 C 程序运行所需要的环境(比如：创建堆栈，设置寄存器参数等，之后跳转到 Rust runtime 的 **入口点(entry point)** 进入 Rust runtime 继续设置）。使用`#![no_main]`移除后并去除main函数后，显式地添加C runtime的入口，C语言函数`_start()`，并使用宏`#[no_mangle]`防止编译器改变函数名。

- 用rustc编译时，`cargo rustc -- -C link-arg=-nostartfiles`可以防止链接到C runtime。注意前一个`--`是cargo的参数，后面的是编译器rustc的参数。

## 第二章 最小化内核

- Rust的编译需要指定目标元组：（cpu 架构、供应商、操作系统和 ABI），如`x86_64-unknown-linux-gnu`。使用`rustc --version --verbose`可以查看当前默认的目标平台，使用`rustc -Z unstable-options --print target-spec-json --target x86_64-unknown-linux-gnu`。

- rCore使用了riscv，因此需要用`cargo build --target riscv64imac-unknown-none-elf`命令或直接在`.cargo/config`中写入

    ```toml
    [build]
    target = "riscv64imac-unknown-none-elf"
    ```
    
    来为项目设置目标三元组。
    
- 使用`cargo install cargo-binutils`和`rustup component add llvm-tools-preview`安装binutils命令行工具，以使用objdump、objcopy等工具。

    具体得，使用file工具查看文件类型等信息；使用 `rust-objdump target/riscv64imac-unknown-none-elf/debug/xxx -x --arch-name=riscv64`查看文件元信息，使用`-d`则可进行反汇编；使用`rust-objcopy target/riscv64imac-unknown-none-elf/debug/xxx --strip-all -O binary target/riscv64imac-unknown-none-elf/debug/kernel.bin`丢弃所有符号表及调试信息，生成二进制内核镜像文件。

- 



