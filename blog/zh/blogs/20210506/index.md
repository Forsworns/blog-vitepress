---
title: SJTU HPC平台使用
description: 使用心得、常用命令
tags: 
- shell
---

[[toc]]

# SJTU HPC 使用笔记 

[上海交大超算平台用户手册 文档 (sjtu.edu.cn)](https://docs.hpc.sjtu.edu.cn/)

登录节点 `ssh user@login.hpc.sjtu.edu.cn`

可视化平台 https://studio.hpc.sjtu.edu.cn/

安装包、编译最好提前申请计算资源，在登陆节点运行计算密集的作业，将会被程序自动查杀，您的账号会被加入到黑名单，并在30-120 分钟内无法登陆，申请节点方法如下

```bash
srun -p small -n 1 --pty /bin/bash
```

数据传输用 scp 传给 data 节点：**data.hpc.sjtu.edu.cn**

远程桌面会计费

默认单作业最长运行 7 天

不提供商业软件，开源软件需要查看列表，没有的写邮件申请

moudle av 查看有啥能加载的模块， moudle list 查看加载了什么模块

交互命令行下，记得设置发送心跳包，XShell 是在会话属性—连接——保持活动状态中

没法用任何涉及 sudo 的命令，但是好像是不让自己安装软件的（把软件安装到用户空间……逃

vscode 的 remote explorer 里创建 ssh target 连过去还是很爽的

HPC 提供的是 32 GB 的 V100，既然是按时计费没用满血亏

## 使用方法
使用前请阅读文档！不要在登录节点进行大型任务以防影像别人的正常登录。有两种提交任务的方法：
1. 使用hpc教程中推荐的任务脚本提交方式。好处是可以在hpc占用高时，由系统调度任务，不必等待分配，坏处是在不确定程序正确性时可能空跑很久浪费资金，且查看实验输出时不方便

2. 请求节点开启bash进行交互，例如，可以使用以下命令申请一个带单个GPU，六个CPU的节点：
srun -n 1 -p dgx2 --gres=gpu:1 --cpus-per-task=6 --pty /bin/bash
等待分配好节点，配合 tmux/screen 使用

## 邮件提醒

邮件提醒的 slurm 示例脚本，提醒事件的可选项有 ALL, BEGIN, END, FAIL

```bash
#!/bin/bash

#SBATCH --job-name=test
#SBATCH --partition=small
#SBATCH -n 20
#SBATCH --ntasks-per-node=20
#SBATCH --output=%j.out
#SBATCH --error=%j.err
#SBATCH --mail-type=end           # 作业结束时，邮件提醒
#SBATCH --mail-user=XX@sjtu.edu.cn
```

## Pytorch 使用示例

`module load miniconda3` 加载 miniconda3 模块

在 DGX-2 上使用 pytorch。作业使用单节点，分配 2 块 GPU，GPU:CPU 配比 1:6。脚本名称可设为 slurm.test

```bash
#!/bin/bash
#SBATCH -J test
#SBATCH -p dgx2
#SBATCH -o %j.out
#SBATCH -e %j.err
#SBATCH -N 1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=12
#SBATCH --gres=gpu:2

# module load cuda # 在其他 partition 上不主动加载不行，可能 DGX-2 上默认加载了，不过可能其他分区也不应该使用显卡资源
# 因为在装包的时候想看一下 cuda 版本，交互是用的 small 分区，不加载 cuda module 找不到 nvcc 应用
module load miniconda3
source activate pytorch-env

python -c 'import torch; print(torch.__version__); print(torch.zeros(10,10).cuda().shape)'
```

其实就是把想要执行的任务写到脚本里，不想用脚本的话，看下面的笔记，tmux维持着交互式的窗口就行了

conda init 过以后，**切环境记得先 deactivate，再 activate 目标环境……（为什么不自动 deactivate 掉前一个环境呢？？？**

使用以下指令提交作业

```bash
$ sbatch slurm.test
```

## 关于计费

[Active Jobs - HPC Studio (sjtu.edu.cn)](https://studio.hpc.sjtu.edu.cn/pun/sys/activejobs)

[HPC与AI平台 (sjtu.edu.cn)](https://account.hpc.sjtu.edu.cn/#/login)

在 Active jobs 里可以看到自己的使用的计算资源，登录节点和数据节点是不计费的

关闭 ssh 窗口后会话终止，会自动停止掉计费，使用类似 screen、tmux 的工具的话自然会接着计费

## Tmux

服务器装的是 tmux，和之前用过的 screen 类似，可以在 ssh 会话结束后保持会话期间的命令正常运行

tmux 按 `ctrl+b` 后可以输入命令选项（类似 vim 的命令模式），比如`%`是左右分屏，`"`是上下分屏，`d` 是退出当前 session，`x`  是关掉当前session

**注意**：在 login 节点创建的 tmux session 在退出后才会继续运行，如果是用计算节点创建的 tmux session，关掉本地命令行，远端计算资源和所有 session 也会随之释放。所以正确的使用姿势（不想用 slurm 脚本的话）是登录到 login 节点，创建 tmux session，进session 后再申请计算资源。但是此时如果用 tmux 分屏，默认还是 login 节点，所以想分屏后命令行仍然是计算节点的话，需要在计算节点的 session 下再次创建 session，但是 tmux 不推荐这么搞，会提示使用特殊的方式启动……

如果用域名登陆服务器，每次登陆可能会给解析到不同节点，用ip登吧

## 常用命令

资源监视：`nvidia-smi` 查看显卡相关信息，`top` 查看 cpu、内存等资源，`df` 查看磁盘容量；可以配合 `watch` 命令使用，比如每十秒打印一次显卡情况 `watch -n 10 nvidia-smi`

有标准输出的程序，想在它执行中间干点别的事情。可以这样：或者直接把输出流重定向到文件里并且让它默认到后台去执行，比如`python main.py > log.txt &`。或者用`ctrl+z` 先把任务切到后台，然后再开别的任务，最后再用 `jobs` 配合 `fg` 命令切回来，比如 `jobs` 下看到它是 1 号，那`fg 1` 就又回来接着执行它了

永远记住`man` 命令，想不起来 `man` 一下

vi 和 vim 的一些区别，比如 vi 不允许在编辑模式下（按下 i 时）用方向键移动光标

