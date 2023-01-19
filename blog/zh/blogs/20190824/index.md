---
title: Anaconda中的cudnn版本问题
description: Loaded runtime CuDNN library：7.1.4 but source was compiled with：7.4.1
tags: 
- 配环境
---

# Anaconda中的cudnn版本问题

[[toc]]

## 错误信息
今天想更新一下win10电脑上的tensorflow和keras，结果就收到了报错：

```shell
Loaded runtime CuDNN library: 7.1.4 but source was compiled with: 7.4.1. 
CuDNN library major and minor version needs to match or have higher minor version in case of CuDNN 7.0 or later version.
If using a binary install, upgrade your CuDNN library. 
If building from sources, make sure the library loaded at runtime is compatible with the version specified during compile configuration.
```

很自然得升级了cudnn，但是错误没有解决，折腾了好久反复升降级

![](./angry.jpg)

## 逃避虽可耻但有用

最后在崩溃边缘发现了原来是一直在使用Anaconda中的cudnn，目录在`\anaconda\pkgs\cudnn-7.1.4-cuda9.0_0\Library`或`\anaconda\envs\xxx\Library`，但是anaconda那里又没有办法拿到7.4.1的`cudnn`更新……遂选择了暂时放弃，回退`tensorflow-gpu 1.10`。

## 一个完美的解决方案

发现了一篇很好的[博客](https://blog.csdn.net/Tilamy/article/details/88616201)，按照博主的做法，我成功更新了环境。为扩散和防止链接失效，这里重述一下：

博主提到可以到[Anaconda官网](https://anaconda.org/anaconda/cudnn/files)那里去下载所需的版本然后手动对上面提到的文件夹内容进行覆盖。但是Anaconda并没有提供`cudnn7.4.1` 。我直接试着将从英伟达官网下载的`cudnn7.4.1`文件(`bin\cudnn64_7.dll`,`lib\x64\cudnn.lib`,`include\cudnn.h`)，覆盖到了`\anaconda\pkgs\cudnn-7.1.4-cuda9.0_0\Library`和`\anaconda\envs\xxx\Library`下对应文件。这个时候跑通了！:tada:

## 后记

本来还好奇我明明下载的是`cuda 10.0`对应的`cudnn 7.4.1`，而在`Anaconda`目录下覆盖的文件夹名称里含有`cuda 9.0`，竟然还能使用。后来才发现 `Anaconda`自身提供了9.0和10.0两个版本的`cuda`……估计根本没有用系统中安装的英伟达套件。

::: tip
用`conda`升级库的时候还是要小心的，不要随便手动指定版本。
:::





