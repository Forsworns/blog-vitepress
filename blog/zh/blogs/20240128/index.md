---
title:  How to pin user pages?
description: Do not use mlock! It does not promise memory pinning. 
tags: 
- OS
- 虚拟化
---

[[toc]]

# How to pin user pages?



## Why mlock is bad

At first simply call `mlock` in the user space. But it only promise the [page will not be swapped out](https://www.man7.org/linux/man-pages/man2/mlock.2.html). But it may be migrated to another physical backend.

Refer to this [answer on stackoverflow](https://stackoverflow.com/questions/15275423/are-mlock-ed-pages-static-or-can-they-be-moved-in-physical-ram):

> No. Pages that have been mlocked are managed using the kernel's unevictable LRU list. As the name suggests (and mlock() guarantees) these pages cannot be evicted from RAM. However, the pages can be migrated from one physical page frame to another. Here is an excerpt from Unevictable LRU Infrastructure (formatting added for clarity):
> MIGRATING MLOCKED PAGES
> A page that is being migrated has been isolated from the LRU lists and is held locked across unmapping of the page, updating the page's address space entry and copying the contents and state, until the page table entry has been replaced with an entry that refers to the new page. Linux supports migration of mlocked pages and other unevictable pages. This involves simply moving the PG_mlocked and PG_unevictable states from the old page to the new page.

## use gup/pup API

We could not do this in the user space, We should use `get_user_pages`/`pin_user_pages` in the kernel.

Refer to the [linux kernel doc](https://www.kernel.org/doc/html/latest/core-api/pin_user_pages.html).

Other related resources:
- https://lwn.net/Articles/807108/
- https://elixir.bootlin.com/linux/v6.7.2/source/mm/gup.c#L3346
- https://github.com/NVIDIA/open-gpu-kernel-modules/blob/bb2dac1f20a06f78e028c4acdc4df1c7908dd91c/kernel-open/common/inc/nv-mm.h#L49
- https://zhuanlan.zhihu.com/p/579444153
