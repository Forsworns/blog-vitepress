---
title: 使用Alias命令接收参数
description: 通过在定义函数使得alias命令接收参数
tags: 
- unix
- shell
---

# 使用Alias命令接收参数

因为实习的缘故，系统得学习了一下shell命令，在练习时，因为每次新建脚本后需要添加执行权限还要用到

```shell
touch xxx.sh
chmod +x xxx.sh # chmod 777 xxx.sh
```

比较麻烦，所以想把上面的命令别名成

```shell
alias touchs="touch $1;chmod +x $1;"
```

但是执行后，再次执行`alias`查看更改，发现变成了

```shell
alias touchs='touch ;chmod +x ;'
```

以为是双引号的缘故（双引号字符串进行转义且转换参数），换成了

```shell
alias touchs='touch $1;chmod +x $1;'
```

但是还是不对，查阅后发现需要使用定义函数的方式曲线救国，这样执行定义的`touchs`的时候就是在执行一个函数了，那么参数就被传到了函数中（注意函数的参数也是从`$1`开始的，`$0`是函数名。

所以正确的方法应该是

```shell
alias touchs='touch_script(){ touch $1;chmod +x $1;};touch_script'
```

:::tip

永久更改需要在`~/.bashrc`中添加上面的语句。

:::

