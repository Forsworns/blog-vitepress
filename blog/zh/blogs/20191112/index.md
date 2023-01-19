---
title: Ubuntu启动Grub引导错误
description: 重装双系统碰到的Grub引导错误
tags: 
- 配环境
- unix
---

# Ubuntu启动Grub引导错误

[[toc]]

把系统玩坏了，重新安装系统后，发现启动不了Ubuntu系统，会停留在Grub界面，类似下图

![](./grub.png)

首先在这个界面下可以输入`exit` 回到windows的启动

### 解决方案

通过阅读Grub2的帮助文档，可以发现解决方案（[文档链接](https://help.ubuntu.com/community/Grub2/Troubleshooting)）

使用如下命令手动挂载image

| 步骤                                  | 说明                                                         |
| :------------------------------------ | ------------------------------------------------------------ |
| 1. `set root=(hdX,Y)`                 | Confirm the correct X,Y values and press ENTER.              |
|                                       | Example: If the Ubuntu system is on sda5, enter:  `set root=(hd0,12)` |
| 2. `linux /vmlinuz root=/dev/sdXY ro` | Example: `linux /vmlinuz root=/dev/sda12 ro`                 |
|                                       | If the *vmlinuz* symlink does not exist, use the full path to the kernel in `/boot`. Example: `linux /boot/vmlinuz-3.2.0-14-generic root=/dev/sda1 ro` |
| 3. `initrd /initrd-xxx-xxx.img`               | Selects the latest initrd image. If the *initrd* symlink does not exist, use the full path to the initrd image in `/boot` as above `vmlinuz`. |
| 4. `boot`                             | Boot to the latest kernel on the selected partition.         |

:::tip

GNU GRUB（GRand Unified Bootloader，简称“GRUB”）是一个来自GNU项目的多操作系统启动程序。GRUB是多启动规范的实现，它允许用户可以在计算机内同时拥有多个操作系统，并在计算机启动时选择希望运行的操作系统。GRUB可用于选择操作系统分区上的不同内核，也可用于向这些内核传递启动参数。

:::



:::tip

vmlinuz指的是内核，作用：进程管理、内存管理、文件管理、驱动管理、网络管理。

initrd.img是一个小的映象， 放的是和启动相关的驱动模块。通常的步骤是先启动内核，然后内核挂载initrd.img，并执行里面的脚本来进一步挂载各种各样的模块。其中最重要的就是根文件系统驱动模块，有了它才能挂载根文件系统，继而运行用户空间的第一个应用程序init或者systemd，完成系统后续的启动。

:::

### 引导文件修复

成功进入系统后，使用如下命令对引导程序进行修复

```shell
# 修复grub
sudo update-grub
sudo grub-install /dev/sda 
reboot #重启
```

也可以试着回到windows中修改启动项，以管理员的身份在cmd中敲入命令：

`bcdedit /set "{bootmgr}" path \EFI\ubuntu\grubx64.efi`

实在不行推荐使用`boot-repair`工具

```shell
sudo add-apt-repository ppa:yannubuntu/boot-repair
sudo apt-get update
sudo apt-get install boot-repair
```

之后在应用菜单中选择boot-repair（引导修复）使用该工具修复。如果修复后出现了多余的启动项，在`/boot/grub/grub.cfg `中删掉相关的条目即可。

