---
title: NS3 简记
description: NS3中混编C++/python代码的痛苦经历
tags: 
- 配环境
- C++
---


# NS3 简记

[[toc]]

## 运行脚本

运行c++脚本 `./waf --run=app_name --command-template="%s --arg_name=arg_value" `。要调用gdb可以在command-template里面加，如`--command-template="gdb %s --arg_name=arg_value" `。

如果是python脚本，是要用 `./waf --pyrun=app_path --command-template="%s --arg_name=arg_value" `。注意这里要用路径，不像运行c++脚本可以直接写`scratch`目录下的脚本名字。

跑python脚本的时候在`scratch`目录生成`__pycache__`可能会导致任务执行失败，要及时清理掉cache。也可以改ns3根目录下的`wscript`中的`def add_scratch_programs(bld)`函数自动跳过该目录。

## 本地编译文档

在线文档有些慢，不如在本地编译一个。需要安装doxygen，同时重新配置一下waf

```shell
sudo apt-get install doxygen
./waf configure --enable-examples --enable-tests
./waf --doxygen
```

如果出现错误提示某些脚本里存在`'\r'`不能识别，可能是因为Linux下换行符和Windows下不同，用VScode这些编辑器转换CRLF到LF就行了。

## Trace

ns3的trace系统定义了一系列的source去追踪不同的变量，在变量发生变化时可以触发sink记录这种变化。在运行模拟实验时，通过用户定义的回调函数来做为trace souce的trace sink。这些source回调函数一般在类内定义为私有变量，命名规则为`m_aTraceFunction`。在定义的时候，这些回调函数的类型为`TracedCallback<T1, T2, ...> `。

需要指出，ns3的回调函数的返回类型默认都是`void`，模板中的`T`是回调函数的参数变量类型。那么我们在写sink的时候，需要定义成`void aTraceSink(std::string context, T1 xx, T2 xx, ...)`。这里的`std::string context`是表明我们自定义sink与哪个source相连接的，即此刻的变化是从哪个节点发出的。

绑定sink回调时候使用`Config::Connet(a context, MakeCallback(&aTraceSink))`。

自定义sink的时候，`std::string context`参数也可以省略掉，写成`void anotherTraceSink(T1 xx, T2 xx, ...)`，在绑定到监听的对象上时使用的是`Config::ConnectWithoutContext`。

绑定sink也可以用`obj.TraceConnect`和`obj.TraceConnectWithoutContext`绑定到一个具体的对象上，用法与`Config::Connect`类似，因为后者本来就是调用了前者实现的，详见官方tutorial。

## Context

Context其实就是节点、应用、函数的名字，比如`/NodeList/*/DeviceList/*/$ns3::WifiNetDevice/Mac/$ns3::AdhocWifiMac/Txop/CwTrace`写的是任意节点上的任意网卡上的任意无线网卡上的Mac层的传输时的congestion window的Trace？然后在ns3文档的api列表中找到`CwTrace`的定义，写一个回调用`Config::Connect`到这个context就可以监听了。用下面的函数可以便捷地从Context中提取NodeId。

```cpp
uint32_t ContextToNodeId(std::string context) {
    std::string sub = context.substr(10); // skip "/NodeList/"
    uint32_t pos = sub.find("/Device");
    NS_LOG_DEBUG("Found NodeId " << atoi(sub.substr(0, pos).c_str()));
    return atoi(sub.substr(0, pos).c_str());
}
```

## 在已有的模块里新增文件

记得改模块目录下的wscript，把新增的文件编译进`build/ns3`里，否则去`scrach`下写测试还是找不到新增的文件。

有时候会破坏python binding的文件依赖，不会改模块binding目录下的设置，把python binding关了不要生成python的对应包了= =`.\build -- --diable-python` 或者`.\nsxxx\waf configure --disable-python`

如果是新增模块，可以用waf自动生成，详见官方文档。

## Python binding 

如果不需要python binding，只用C++，官方建议就是直接用`./build.py -- --disable-python `或`./waf --disable-python`，这样build快而且不会出现和python有关的问题。

如果想用python binding，但激活了Anaconda中的环境，在build时python binding会无法enable。

使用`.\waf configure`之后，发现具体问题是"Testing pyembed configuration   : Could not build a python embedded interpreter"错误。

似乎很多使用waf构建的项目中都会出现这个问题，我找不到合适的解决方法。尝试把anaconda环境deactivated掉就好了。这里deactivated后，最好改一下`build.py` 和`waf`中的解释器，默认是`#! /usr/bin/env python`在一些机器上可能会去调用`pyhon2`。改成`#! /usr/bin/env python3`。

然后在用官方提供的`build.py`脚本或者用`waf`构建后，再激活Anaconda中的某个环境，`waf`会自动link一遍build过的python binding，在Anaconda的某个环境里就可用了~

可惜一切努力全部木大了。python binding不支持很多底层的api，而且**不支持使用回调的tracing**，只可以使用pcap和ascii文件。同时后面会提到的一个repo，我这边又build不了，这也导致我只能去考虑在ns3中混编python，遇到了很多新坑。

## ns3混编(embedding) Python

直接用python binding是不可能了，虽然有C++的tensorflow，但是看了一下配置又很麻烦。就想用cpp调用python，查了一下写了一些测试似乎很方便嘛。想着这样算法的实现上可以用python灵活简单一点，也有大段现成的算法实现。那就看看怎么embedding python into c++。:yum:

### 一般情况下的c++/python混编

一般的情况下，在C++中混编python只需要加上python的头文件`#include 'Python.h'` （这里要注意可能需要用绝对路径，看你python怎么装的），然后为g++添加如下参数进行编译就行了

```shell
g++ callpy.cpp `python3-config --cflags` `python3-config --ldflags` -fPIC # 添加的参数会自动展开为头文件和链接库参数
```

使用`Py_Initialize ();`和`Py_Finalize ();`可以初始化和关闭Python解释器。在C++中，python的变量都被创建为一个类型为`PyObject`的指针。

模块导入方面，若是使用 `PyRun_SimpleString ("import os");`导入模块，则模块在C++代码中可见，可以使用`PyRun_SimpleString (print(os.getcwd())；`若使用的是 `pName = PyUnicode_DecodeFSDefault ("os"); pModule = PyImport_ImportModule (pName);`导入模块，则无法通过``PyRun_SimpleString`去使用`os`。

使用`PyModule_GetDict(pModule)`从模块中获取一个字典结构。

使用`pFunc = PyDict_GetItemString(pDict,"disp")`去从字典中获取名为`disp`的函数，使用`PyCallable_Check(pFunc)`检查获取的指针是否指向一个可以调用的函数。

`pArgs = PyTuple_New(0)`创建一个空的元组`pArgs`去作为函数参数，它可以通过` PyTuple_SetItem(pArgs, 0, Py_BuildValue(""));` 初始化，之后使用`PyObject_CallObject (pFunc, pArgs);`调用函数。

使用函数`PyObject* Py_BuildValue(char *format, ...)`可以把C++的变量转换成一个Python对象。当需要从C++传递变量到Python时，就会使用这个函数。`format`参数中常用的格式有

- i 表示int
- I 表示unsigned int
- f 表示float
- O 表示一个Python对象
- 更多见Python[文档](https://docs.python.org/3/c-api/arg.html)

例如`PyTuple_SetItem(pArgs, 0, Py_BuildValue("i",3));`，把第一个参数设置成了整型变量3。如果是直接用去构造函数的参数，往往需要写成元组形式如`pArgs=Py_BuildValue("(ii)",3,3)`，在只有一个参数的时候尤其需要注意如`pArgs=Py_BuildValue("(i)",3)`。想要取出python函数的返回值要用`PyArg_Parse`或`PyArg_ParseTuple`，使用引用传递按上面的`format`字符串赋值给C++变量，如`PyArg_Parse (retObj, "d", &ret);`。这些api在使用的时候一定要注意`format`字符串中的数据格式！如果把数据格式写错了，bug会很难找。

使用`instanceObj = PyObject_CallMethod(pModule,"clsName",NULL);`可以创建一个`clsName`类型的对象。对象的`disp`方法可以用` PyObject_CallMethod(instanceObj,"disp",NULL)`调用，如果附加参数的话需要直接用前面`format`参数的模板语法。（官方文档推荐使用`PyInstanceMethod_New`去创建实例，但是实际使用时似乎创建失败也不会返回NULL，导致很难debug）。

在python代码中使用面向对象的思想，是为了维护一些在C++中调用方法去更改的变量。后来测试发现在C++中使用`PyImport_ImportModule()`加载模块后，模块中的全局变量会自动加载，因此在调用函数的时候，也可以通过global关键字维护全局变量，避免使用对象的概念，在C++里调用的时候会简单一些。

如果在C++中导入py脚本出现错误，试着先独立运行python脚本，确保它是正确的。出现问题时尝试print输出调试，python中的错误没法报出来，只能`print()`输出调试。

更多具体的混编写法，可以参考[python官方文档](https://docs.python.org/3/c-api/)中的介绍。

### 可行方案：修改wscript

但是写了一段时间真把cpp和python往一起整合的时候，才发现，“不对啊，ns3是用waf去管理编译过程的”。:imp:天真地以为把`build`目录下的`ns3`头文件和`lib`里的动态链接库的路径都加到g++后就行了。但是果然失败了……

于是求助万能的google，可惜网上似乎没有这么干的人= =。没办法，自己去读了一下[waf的文档](https://waf.io/apidocs/tools/python.html)吧，刚好发现了这段

```python
# Support for Python, detect the headers and libraries and provide use variables to link C/C++ programs against them:
def options(opt):
	opt.load('compiler_c python')
def configure(conf):
    conf.load('compiler_c python')
    conf.check_python_version((2,4,2))
    conf.check_python_headers()
def build(bld):
    bld.program(features='pyembed', source='a.c', target='myprog')
    bld.shlib(features='pyext', source='b.c', target='mylib')
```

假设环境都合适，那这段的意思就是，要在waf中使用c++和python混编，只需要在`build`函数里面调用 `bld.program(features='pyembed', source='a.c', target='myprog')`。再浓缩一下，就是要把生成程序的函数的`feature`参数设置成`'pyembed'`。这下我们知道了混编python改waf配置就可以了。

经过尝试，对于ns3的具体做法是打开ns3主目录下的`wscript`，搜索一下`options`函数在哪里，然后做如下改动。

```python
# 修改原来的option函数，加载python解释器
def options(opt):
    # options provided by the modules
    opt.load('compiler_c')
    opt.load('compiler_cxx')
    opt.load('cflags')
    opt.load('gnu_dirs')
    opt.load('python')
    # other commands
```

`configure`函数似乎是可改可不改的，毕竟是自己的机子，默认没问题，不检查环境也行~

重要的是创建程序时的`features`参数。因为依赖复杂，ns3的wscript写法也比较复杂，和上面简单的waf示例脚本不同，ns3的wscript中为每个程序创建了一个对象，分别设置各种选项，然后为每个程序添加依赖项。这里我们需要找到`create_ns3_program`函数的定义，然后做如下修改

```python
# 在features参数后面添加一个pyembed就行了
def create_ns3_program(bld, name, dependencies=('core',)):
    program = bld(features='cxx cxxprogram pyembed') # waf可以通过空格分隔选项
    program.is_ns3_program = True
    program.name = name
```

这样做其实挺粗暴的，其他一些没有用python的cpp代码也会被添加这项feature，可能更好的做法是单独在`scratch`下写wscript，但是我不会:broken_heart:。

另外因为会有`__pycache__`生成，最好再在上面的wscript中添加如下代码，在编译时跳过cache，否则要每次清理掉cache再编译。

```python
def add_scratch_programs(bld):
    ...
    try:
        ...
        if os.path.isdir(os.path.join("scratch", filename)):
            if filename == "__pycache__":
                continue
            ...
```
还有需要注意的一点是，如果在cpp中导入了自己的python包，要注意下包的路径，否则会找不到。因为ns3的脚本运行时候的路径是在根目录。可以把包copy到ns3的根目录，或者在用`PyRun_SimpleString ("sys.path.append('./where you place package')");`加个路径。

如果是用 anaconda 这种，还需要向路径中添加当前环境的包的位置。

改完之后，万幸，代码能跑起来了~

体会就是“只要我们不停下脚步，道路就会不断延伸”。

▏n                                                                       
█▏　､⺍                                                                   
█▏ ⺰ʷʷｨ                                                                   
█◣▄██◣                                                                   
◥██████▋                                                               
　◥████ █▎                                                               
　　███▉ █▎                                                               
　◢████◣⌠ₘ℩                                                               
　　██◥█◣\≫                                                               
　　██　◥█◣                                                               
　　█▉　　█▊                                                             
　　█▊　　█▊                                                             
　　█▊　　█▋                                                             
　　 █▏　　█▙                                                             
　　 █                                                                   

### 两年后重新编译这个混编的项目
混编是基于[别人做 lte-u 的版本](https://bitbucket.org/ns3lteu/ns-3-dev-lbt/src/laa-wifi-coexistence/src/) 做的，只是在 scratch 目录下面添加了自己的代码。

我现在的 WSL 是安装的 Ubuntu 20，默认是 gcc9 和 python3.9，但是很奇怪的是 `/usr/include/` 下默认是安装的 python3.8-dev 的头文件，混编很麻烦会有各种奇怪的问题，没法编译过。当时没有写清楚配置，现在又麻烦了。

既然已经想不起来当时的配置了，只能排列组合尝试了（没有找到 gcc、python-dev 和 python 的对应版本的表）。最后确认是 gcc 7.3，python3.6-dev 和 Python 3.5，成功编译过了。但是当时肯定不是这个组合的，python 代码里用了 `f"{}"`格式字符串，应该当时是在 python3.6 以上的。

安装 gcc 7.3：apt 源上的gcc7 不是 gcc 7.3，是 gcc 7.5，会有 LTO 不匹配的问题，类似于 [该老哥碰到的](https://segmentfault.com/a/1190000022655994)。所以 gcc 7.3 要从头编译，之后可以用 update-alternative 管理下本机的多版本 gcc，注意在编译 ns3 项目的时候切换回来就行了，同时保持 g++ 和 gcc 版本一致。编译过程中可能会碰到 glibc 新版本丢弃掉了 `<sys/ustat.h>` 的 [问题](https://blog.csdn.net/weixin_46584887/article/details/122538399) 和一个静态检查的[问题](https://stackoverflow.com/questions/63437209/error-narrowing-conversion-of-1-from-int-to-long-unsigned-int-wnarrowi)。

想要安装低版本的 python3.6-dev，想要添加额外的源，可以参考这个[链接](https://stackoverflow.com/questions/43621584/why-cant-i-install-python3-6-dev-on-ubuntu16-04)。注意要安的是 python3.6-dev，确保 `/usr/include` 下有 python3.6 头文件目录，代码里会引用这个下面的 `Python.h`。最新的 conda 安装目录下的 `include` 中默认携带的是 python3.9-dev 的头文件，不能直接拿来用。

之后 conda 里安 python 3.6 的环境，否则也可能会报 LTO 版本不一致问题。此时可以在进入到 conda 的 python 3.6 环境下编译 ns3 项目了。

以及 Python 出问题的地方可以用，`PyErr_Print()` 函数可以用来打印错误信息。

### 补充：ns3文档中相关内容

事实上，对于在编译时添加别的依赖ns3文档中有[相关描述](https://www.nsnam.org/wiki/HOWTO_use_ns-3_with_other_libraries)（当然去读主目录下的`wscript`也可以发现，可以试着在`wscript`中搜索`CXXFLAGS`），可以用`CCFLAGS_EXTRA`这些选项为编译器添加参数或者在`wscript`里面改，原因是`wscript`中这样定义过了

```python
# append user defined flags after all our ones
for (confvar, envvar) in [['CCFLAGS', 'CCFLAGS_EXTRA'],
                          ['CXXFLAGS', 'CXXFLAGS_EXTRA'],
                          ['LINKFLAGS', 'LINKFLAGS_EXTRA'],
                          ['LINKFLAGS', 'LDFLAGS_EXTRA']]:
```

于是[stackoverflow](https://stackoverflow.com/questions/11876088/how-to-build-ns-3-to-use-c0x-c11-libraries)上有人提到如果是为编译器添加c++11选项可以这么做

```bash
CXXFLAGS="-std=c++0x" ./waf build
```

但是我试过这类方法，失败了，原因是用了`CXXFLAGS`，`CXXDEFINES`，`LINKFLAGS`这些参数对`python3-config --cflags`，`python3-config --ldflags` 和`-fPIC`都不合适= =我不知道咋用这种方法设置了。


## 一个很有趣的repo

之前打算用python的binding api，刚好发现了这个repo：[ns3-gym](https://github.com/tkn-tub/ns3-gym) 。

但是把这个repo clone下来后，先去编译ns3的部分，再按README中`pip3 install ./src/opengym/model/ns3gym`安python的api，不是像其他模块那样用pybindgen自动生成的api。

但是很可惜没用build成功，具体情况记录在该[issue](https://github.com/tkn-tub/ns3-gym/issues/32)。问题主要出在protobuf和zmq上。protobuf作者用了一个比较旧的版本，从PPA拉取后却检测不到，后来发现是登录用户的环境变量没加`/usr/bin`，这个主要是用来编译`src/opengym/model/messages.proto`和提供链接库的，编译方法是在`src/opengym/model`下调用`protoc ./messages.proto --cpp_out=./`。而且这里如果anaconda环境中安了python版的protobuf，同样需要关掉anaconda的环境，用`which protoc`看一下吧。zmq的话，作者提到用 **libzmq5-dev**，但是ubuntu16.04上只能找到 **libzmq3-dev**。不过似乎是没有什么兼容性问题的，毕竟最后可以跑起来。zmq这里出问题的原因是作者接受了一个pr，改了api的调用方式，但是我们的版本里某些参数似乎还是optional的。不写平台、版本乱提pr害人不浅= =

## TIPS

- 总是考虑去用Helper

  ns3中的很多类都有helper类，尝试使用它们~

- 直接用官方的ShowProgress绑定到std::cout上会有问题

- Schedule用来安排函数的执行时，只需要指定运行时间并引用函数的指针，如`Simulator::Schedule (Seconds (1), &FunctionName)`；用来安排某个类的方法的执行时，要写出执行该方法的对象的指针，如如`Simulator::Schedule (Seconds (1), &ClassName::FunctionName,ObjectOfTheClass)`。




