---
title: Yet Another JSON Lib
description: 阅读了知乎上的教程用Modern C++重写~
tags: 
- C++
---


# Yet Another JSON Lib

[[toc]]

一直找不到一个简单的Modern C++项目练手，在github上找了很久都太复杂了。最近在知乎上读到了一个写JSON库解析的[系列教程](https://zhuanlan.zhihu.com/json-tutorial)（后续简写为教程），作者是写给C初学者的。

想了想我太菜了，果然还是这种事无巨细的教程适合我QAQ，于是就动手了：[项目地址](https://github.com/Forsworns/yJson)。

既然主要目的是练习新标准，所以难免有拿着锤子看到哪都是钉子的感觉。可惜这个项目里没有多少用到模板的地方，好多deep♂dark♂magic都还没有试过。设计上和教程相同，也没有过多使用OOP。

那么在原教程的基础上的主要改动如下：

### 命名空间、作用域

很自然的使用了命名空间防止冲突，干掉了原来的前缀。

`using`的新语义用来替代`typedef`也很舒服。

c++17可以在`if/switch`中定义并初始化变量，在`parseArray`和`parseObject`中。

### 强枚举类型

主要就是把原来的枚举都改成了强枚举类型。教程中用到的

不过现在用起来可能会更冗杂……毕竟需要加类名。

### 使用了的智能指针

C++内存、锁、套接字等资源管理的思路是RAII（Resource Acquisition Is Initialization），资源在初始化时获取、在离开作用域后销毁。感谢智能指针，干掉了教程里的`free`，在教育意义上似乎是种退步:laughing:。但是好处是不用担心内存泄漏问题了。

在`parseObject`函数中，没有直接创建指向`Entry el`的`val`的指针，而是选择和解析`el->key`一样，使用临时变量`elKey`和`elVal`传递。有两种常见的错误方式：如果是用`auto elVal = make_shared<Value>(el->val)`会将`el->val`复制一份，调用`parseValue(s, elVal)`不会修改`el->Val`；如果是用`shared_ptr<Value> elVal(&el->val) `，则会导致`shared_ptr`在执行析构的时候，重复析构`el->val`。

### 去掉了手写的数据结构

干掉了手写的复杂数据结构，改用了标准库，比起教程似乎也是一种退步:laughing:。比较值得一提的是，在解析对象的时候，本来设想的是使用`unordered_map`。但是由于数据结构间互相引用，需要前向声明一个不完整的类。这个时候就出现了一个坑，C++标准库中的容器不支持使用不完整类型，似乎boost做了支持（未考证），而标准库则直到C++17才允许部分容器使用不完整类型。也就是说，目前只有`vector`,`list`和`forward_list`支持使用不完整类型，如下

```cpp
class A; // forward declaration
using myVec = vector<A>; // right
vector<A> a; // right
// using myMap = map<int,A>; wrong
// map<int,A> b; // wrong
class A{};
```

### 未做OOP实现 建议[参考](https://github.com/zsmj2017/MiniJson)

