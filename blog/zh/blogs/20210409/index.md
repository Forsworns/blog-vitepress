---
title: Makefile 笔记
description: 人傻就要多记笔记
tags: 
- C++
- 配环境
---

[[toc]]

# Makefile 笔记

记录一些遇到的问题

## 伪目标 Phony Target

当目录下路径或文件与 Makefile中 的目标名冲突的时候，可以通过定义伪目标的方式避免冲突：

如下面这个例子

```bash
touch clean
make clean
```

这样不会执行 Makefile 中定义的 clean 目标，而是会提示我们 `clean is up to date`

此时需要使用 `.PHONY` 关键字来定义 clean

在 Makefile 中需要写

```makefile
.PHONY: clean
```

## 预定义的变量

| 预定义变量 | 含义 |
| ---------- | ---- |
| AR           | 库文件维护程序的名称，默认值为ar     |
| AS          | 汇编程序的名称，默认值为as     |
| CC           | C 编译器的名称，默认值为cc     |
| CPP           | C 预编译器的名称，默认值为$(CC) –E     |
| CXX           | C++编译器的名称，默认值为g++     |
| FC           |FORTARAN 编译器的名称，默认值为f77      |
| RM           |文件删除程序的名称，默认值为rm -f      |
| ARFLAGS           | 库文件维护程序的选项，无默认值     |
| ASFLAGS           | 汇编程序的选项，无默认值     |
| CFLAGS           | C 编译器的选项，无默认值     |
| CPPFLAGS           | C 预编译的选项，无默认值     |
| CXXFLAGS           | C++编译器的选项，无默认值     |
| FFLAGS           | Fortran 编译器的选项，无默认值     |


## 默认CC

在默认情况下，编译器使用 `cc`，可以通过`update-alternatives --list cc` 命令查看安装的 C 编译器种类，然后使用 `update-alternatives --set cc` 按照提示设置。 

## 内存泄漏检测

之前用过 valgrind 工具辅助分析。还有一个比较好用的是 sanitize，可以在编译时作为 `CFLAGS` 添加，比如使用 address 选项检测非法内存地址

```makefile
ifeq ($(ASAN),1) # 需要定义该参数
CFLAGS += -fsanitize=address
LDFLAGS += -fsanitize=address
endif
```

`-fsanitize=leak` 则可以检查泄漏

## 代码覆盖率

gcov是在代码运行时统计代码覆盖率的工具，随着gcc一起发布的。
它的使用很简单，需要在编译和链接时增加-fprofile-arcs -ftest-coverage生成二进制文件。

```makefile
ifeq ($(COVERAGE),1)
CFLAGS += -fprofile-arcs -ftest-coverage
LDFLAGS += -fprofile-arcs
endif
```

gcov主要使用.gcno和.gcda两个文件。
.gcno是由-ftest-coverage产生的，它包含了重建基本块图和相应的块的源码的行号的信息。
.gcda是由加了-fprofile-arcs编译参数的编译后的文件运行所产生的，它包含了弧跳变的次数和其他的概要信息。

## 为目录下所有文件生成目标代码

可以使用例如下面 Makefile 的写法，使用通配符

```makefile
SOURCES = $(wildcard *.c)
OBJS = $(patsubst %.c,%.o,$(SOURCES))

All:$(OBJS)
```

## 特殊符号

`$@` 表示目标文件

`$^` 表示所有的依赖文件

`$<` 表示第一个依赖文件

`$?` 表示比目标还要新的依赖文件列表

`$%` 仅当目标是函数库文件中，表示规则中的目标成员名。例如，如果一个目标是`foo.a(bar.o)`，那么，`$%`就是`bar.o`，`$@`就是`foo.a`。如果目标不是函数库文件，那么，其值为空。

`$+` 这个变量很像`$^`，也是所有依赖目标的集合。只是它不去除重复的依赖目标。

`$*` 这个变量表示目标模式中 `% `及其之前的部分。如果目标是 `dir/a.foo.b`，并且目标的模式是`a.%.b`，那么，`$*`的值就是`dir/a.foo`。这个变量对于构造有关联的文件名是比较有较。如果目标中没有模式的定义，那么`$*`也就不能被推导出，但是，如果目标文件的后缀是make所识别的，那么`$*`就是除了后缀的那一部分。例如：如果目标是“foo.c”，因为“.c”是make所能识别的后缀名，所以，`$*`的值就是`foo`。这个特性是GNU make的，很有可能不兼容于其它版本的make，所以，你应该尽量避免使用`$*`，除非是在隐含规则或是静态模式中。如果目标中的后缀是make所不能识别的，那么`$*`就是空值。

## 赋值符号

- `=` 是最基本的赋值
- `:=` 是覆盖之前的值
- `?=` 是如果没有被赋值过就赋予等号后面的值
- `+=` 是添加等号后面的值

## 递归编译多目录

假设目标代码和可执行文件都在 `debug` 目录下，其他都是源代码文件，则根目录下 Makefile

```makefile
#设置编译器
CC=gcc
#debug文件夹里的makefile文件需要最后执行，所以这里需要执行的子目录要排除debug文件夹，这里使用awk排除了debug文件夹，读取剩下的文件夹
SUBDIRS=$(shell ls -l | grep ^d | awk '{if($$9 != "debug") print $$9}')
#无需下一行的注释代码，因为我们已经知道debug里的makefile是最后执行的，所以最后直接去debug目录下执行指定的makefile文件就行，具体下面有注释
#DEBUG=$(shell ls -l | grep ^d | awk '{if($$9 == "debug") print $$9}')
#记住当前工程的根目录路径
ROOT_DIR=$(shell pwd)
#最终bin文件的名字，可以更改为自己需要的
BIN=myapp
#目标文件所在的目录
OBJS_DIR=debug/obj
#bin文件所在的目录
BIN_DIR=debug/bin
#获取当前目录下的c文件集，放在变量CUR_SOURCE中
CUR_SOURCE=${wildcard *.c}
#将对应的c文件名转为o文件后放在下面的CUR_OBJS变量中
CUR_OBJS=${patsubst %.c, %.o, $(CUR_SOURCE)}
#将以下变量导出到子shell中，本次相当于导出到子目录下的makefile中
export CC BIN OBJS_DIR BIN_DIR ROOT_DIR
#注意这里的顺序，需要先执行SUBDIRS最后才能是DEBUG
all:$(SUBDIRS) $(CUR_OBJS) DEBUG
#递归执行子目录下的makefile文件，这是递归执行的关键
$(SUBDIRS):ECHO
    make -C $@
DEBUG:ECHO
    #直接去debug目录下执行makefile文件
    make -C debug
ECHO:
    @echo $(SUBDIRS)
#将c文件编译为o文件，并放在指定放置目标文件的目录中即OBJS_DIR
$(CUR_OBJS):%.o:%.c
    $(CC) -c $^ -o $(ROOT_DIR)/$(OBJS_DIR)/$@
CLEAN:
    @rm $(OBJS_DIR)/*.o
    @rm -rf $(BIN_DIR)/*
```

子目录 makefile

```makefile
#子目录的Makefile直接读取其子目录就行，使用 grep 过滤出来目录（ls 后会以d为标识开头）
SUBDIRS=$(shell ls -l | grep ^d | awk '{print $$9}')
#以下同根目录下的makefile的相同代码的解释
CUR_SOURCE=${wildcard *.c}
CUR_OBJS=${patsubst %.c, %.o, $(CUR_SOURCE)}
ALL:$(SUBDIRS) $(CUR_OBJS)
$(SUBDIRS):ECHO
    make -C $@
$(CUR_OBJS):%.o:%.c
    $(CC) -c $^ -o $(ROOT_DIR)/$(OBJS_DIR)/$@
ECHO:
    @echo $(SUBDIRS)
```

生成的目标文件和可执行文件目录`debug`下 makefile

```makefile
OBJS=*.o
ODIR=obj
$(ROOT_DIR)/$(BIN_DIR)/$(BIN):$(ODIR)/$(OBJS)
    $(CC) -o $@ $^
```

## 编译时添加宏定义

假设代码如下，检查是否存在

```c
// test.c
#include <stdio.h>  
#include <stdlib.h>  
  
int main(int argc, char* argv[])  
{  
      
#ifndef A_MACRO
    printf("\n");  
#endif  
  
    return 0;  
}
```

命令行直接使用 gcc 编译时，可以传递 `-D` 参数来定义

```bash
gcc test.c -D A_MACRO
```

在 Makefile 中，当然可以在 gcc 后面写 -D，也可以直接加在 `CFLAGS` 中，同时也可以用下面的方式给 make 传递参数决定是否定义该宏

```makefile
MACROS=
CFLAGS=-g $(MACROS)
all:a.out
g++ CFLAGS -o a.out
```

使用 make 时，便可以这样写

```bash
make DEBUG='-D A_MACRO'
```

## 杂项

- 当没有指明目标时，make 默认执行 Makefile 中定义的第一个目标，也称为默认目标

- 在 Makefile 中，使用 `@echo` 可以执行 `echo` 命令

- 在 Makefile 中，目标后可以添加其他目标，表示依赖关系，即当前目标需要这些目标作为支持，会先构建依赖着的其他目标，再执行剩下的命令，即基本语法是

  ```makefile
  target: prerequisites
  	command
  ```

- 直接使用 `=` 就可以在 Makefile 中定义变量如 `CC = gcc`，使用 `$(CC)` 可以读取它 

# cmake 笔记

使用 cmake 读取 CMakeList.txt 可以自动生成需要的 Makefile。CMakeList 的语法：

## 指定安装目录

通过定义 `CMAKE_INSTALL_PREFIX:PATH` 更改安装路径，在无法获取 sudo 权限时候可以使用这种方式安到当前用户目录下？

```bash
mkdir build
cd build
cmake -DCMAKE_INSTALL_PREFIX:PATH=$(realpath ../install) ..
make -j N install
```

例如这个例子中，通过 `realpath` 获取相对路径的绝对路径名，从而安装在上级的 install 目录下

## 多级目录、多个链接库

例如这里我有一个

```bash
.
├── main.c
├── first.c
├── first.h
└── second
```

这样的文件目录，怎么在根目录下构建 `main.c` 呢？同时依赖于 `first.c` 文件和 `second` 目录下的两个库（均为 C 实现），同时 `first.c` 又依赖于 `second`目录下的库。

在根目录下，编写

```cmake
cmake_minimum_required (VERSION 3.10.2)
project (laser)

set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall")
add_definitions(-DENABLE_DBG)

# second lib
add_subdirectory(second) # add this directory to project, traverse it, and apply the `CMakeLists.txt` inside it
list(APPEND EXTRA_INCLUDES "${PROJECT_SOURCE_DIR}/second")
set_target_properties(second PROPERTIES LINKER_LANGUAGE C)

# lib for first main logic
add_library(first first.c)
target_link_libraries(first second) # built target for `first` lib would be dependent on on second lib
target_include_directories(first PUBLIC
  ${PROJECT_BINARY_DIR}
  ${EXTRA_INCLUDES}
  ) # the headers in the second lib would be added to include path, so that we do not need to configure relative paths when include them in codes

# main executable file
set(SRC_LIST main.c)
add_executable(laser ${SRC_LIST})
target_link_libraries(laser first)
# or target_link_libraries(laser first second), up to your requirements on second lib
```

对 first 和 second 两个库和 main.c 对应的代码都构建编译 target，通过 `target_link_libraries` 去声明依赖关系，这样会自动先编译 second 库，再编译 first 库，把 second 库链接给它，再链接 first 库编译 main.c 对应的可执行文件。使用 cmake 就是一个声明依赖关系的过程，而且很多步骤 cmake 都会自动帮忙干。

那么在 second 目录下，还需要加一个，定义一个名为 second 的库，并用 `file()` 函数方便地选取目录下所有文件

```cmake
file(GLOB SOURCES *.c)
file(GLOB HEADERS *.h)

add_library(second ${SOURCES} ${HEADERS})
```

# Reference 

[Make - GNU Project - Free Software Foundation](http://www.gnu.org/software/make/)

[seisman/how-to-write-makefile: 跟我一起写Makefile重制版 (github.com)](https://github.com/seisman/how-to-write-makefile)

[gcc编译选项-fprofile-arcs -ftest-coverage之代码覆盖率_夜风的博客-CSDN博客](https://blog.csdn.net/u014470361/article/details/103447678)

[多文件目录下makefile文件递归执行编译所有c文件 - Shirlies - 博客园 (cnblogs.com)](https://www.cnblogs.com/Shirlies/p/4282182.html)