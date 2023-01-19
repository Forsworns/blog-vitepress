---
title: Man 命令查出来的数字是啥意思
description: Unix Man 相关命令
tags: 
- 转载
- unix 
- shell

---

[[toc]]

转自 [Linux / UNIX: Getting help with man pages and how to use them](https://www.cyberciti.biz/faq/howto-use-linux-unix-man-pages/)

在读一些文档的时候看到如 [cmake-commands(7)](https://cmake.org/cmake/help/latest/manual/cmake-commands.7.html)，[bpf(2)](https://man7.org/linux/man-pages/man2/bpf.2.html)，不知道数字是啥意思……查阅后原来是 man 的章节分类，记录一下：

- Section # 1 : User command (executable programs or shell commands)
- Section # 2 : System calls (functions provided by the kernel)
- Section # 3 : Library calls (functions within program libraries)
- Section # 4 : Special files (usually found in /dev)
- Section # 5 : File formats and conventions eg /etc/passwd
- Section # 6 : Games
- Section # 7 : Miscellaneous (including macro packages and conventions),
- Section # 8 : System administration commands (usually only for root)
- Section # 9 : Kernel routines [Non standard]

所以，`useradd(8)` 指代的就来自 sys admin section # 8 的 user add 命令的文档。


# 原文节选：怎样科学阅读 Linux 下的 man pages

## man 命令

man 命令可以用来打印 man (manual) pages。

man 命令格式：
```bash
man {command-name}
man {section} {command-name}
```
例如，查看 clear 命令的帮助页面：`man clear`。

查看特定章节：`man 5 passwd`。

### 查询某个命令的帮助页面
```bash
$ man -f printf
```
示例输出：
```
printf (1)           - format and print data
printf (3)           - formatted output conversion
```
这等价于
```bash
$ whatis -r printf
````
### 在 man page 中检索关键字的例子
找到所有带有该关键字的命令的帮助内容。

```bash
$ man -k passwd
$ man -k printf
```
等价于
```bash
$ apropos printf
$ apropos passwd
```

### 打开所有匹配到的 man pages
类似 `man -k` ，但是这次会直接打开它们的详情页，可以按 `[Enter]/[CTRL+D]`键跳过。

## Info
也可以通过 `info` 命令查看文档，有时比 man 提供的内容更加丰富，例如：
```bash
$ man date
$ info date
```

Info 页面的命令
- q – 退出 info 页面
- n – 下一章
- p – 上一章
- u – 上一层


## /usr/share/doc
`/usr/share/doc` 下也有一些有趣的帮助文档。

除了本文外，该系列还有几则安装和使用 Man 的教程：
- How to add/install man pages in Alpine Linux
- How to install man pages on a CentOS Linux 6/7
- Unix / Linux: Display Color Man Pages
- HowTo: Linux / UNIX Create a Manpage
- Ubuntu Linux install man pages