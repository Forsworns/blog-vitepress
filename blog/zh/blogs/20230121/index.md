---
title: 博客升级改造
description: 2023年了，博客终于换到了 Typescript 和 Vue3 了
tags: 
- 博客搭建
---

# 博客升级改造

最开始是2019年建立的博客，当时用 Vuepress 搞的，但是没两天发现 Vuepress 就已经 deprecated 了！

但是因为显而易见的原因：懒得学 Typescript 和 Vue3，就一直没改造博客。

[](/assets/embarrassed.jpg)

前两天看了下 VitePress 已经到了 1.0 了，又看到了 [vitepress-blog-zaun](https://github.com/clark-cui/vitepress-blog-zaun) 这个项目，干脆就抄了这个老哥的代码。

但是这个老哥把 markdown-it 插件的配置写错位置了，markdown-it-katex 一直用不了，看了半天才发现问题。

这次折腾的过程中还碰到一个很有趣但是又很折磨的一个[WSL 的问题](https://github.com/microsoft/WSL/issues/4197)，感觉还是单另写一篇记录下比较合适。

这次算是一个大改造，纪念一下具体做了些什么。

- 语言和框架更新。（不过说实话，可维护性和安全性提升？不存在的，个人博客 = = 接下来的几年估计都加不了几行 Typescript，单纯赶个时髦哈哈。

- 移除了构建过程中的一些脚本，把这些功能加到了自定义主题里。说起来确实很奇怪，当时Gitalk评论、文章列表、首页文章我为什么要放到构建命令里去添加……

- 升级到 Google Analytics 4（不然还发现不了 Universal GA 要不能用了 = =。

- VitePress 不支持插件了，要自己写，把之前 VuePress 里用的一些插件迁移了过来。当然看到了一些方法是写 Vite 插件给 VitePress 用。

- markdown-it-katex 社区版似乎没人维护了，大家都在自行 fork 胡乱发版，自己拷贝进来维护自用吧……