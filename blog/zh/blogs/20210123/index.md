---
title: Rust：如何创建一个的递归的trait？
description: Rust中创建一个递归的Trait的“一百种”实现方式
tags: 
- Rust
---

[[toc]]

# Rust：如何创建一个的递归的trait？

最近遇到了这个情况，在 [StackOverflow]([How to define a recursive trait bound in Rust? - Stack Overflow](https://stackoverflow.com/questions/65845197/how-to-define-a-recursive-trait-bound-in-rust))上提了一个问题，顺便做一下记录和翻译。

## 问题陈述

```rust
struct LinkNode {
    next: Option<Box<LinkNode>>
}

impl LinkNode{
    fn get_next(&self) -> Option<Box<LinkNode>>{
        None
    }
    fn append_next(mut self, next: LinkNode) -> Self{
        self
    }
}
```

从官方文档中，我们知道可以通过这样的方式来创建一个递归的链式结构。

但是如果想要把它抽象成一个trait该怎么搞呢？

### 初步尝试

可能直觉上是这样的

```rust
pub trait Linkable {
    fn get_next(&self) -> Option<Box<impl Linkable>>; 
    // or
    // fn get_next(&self) -> impl Linkable; 
    fn append_next(&mut self, next: impl Linkable) -> Self;
}
```

但是很不幸，出于技术原因，**目前**`impl trait`语法糖的使用很受限制，不仅不能在`Box<>`中作为模板参数，也不能在trait中直接作为返回类型。

那可能想到，既然这个语法糖没法应用，换成下面这样可以吗？

```rust
pub trait Linkable<T:Linkable<T> + Clone> : Clone {
    fn get_next(&self) -> Option<Box<T>>;
    fn append_next(&mut self, next: T) -> Self;
}
```

很不幸，这样的写法虽然可以通过编译，但是在构造的时候需要递归传递参数。这不是麻烦不麻烦的问题（模板参数编译器可以为我们推导出来，不需要显示声明），而是压根没法构造出来，因为这样会无限递归下去，不存在尽头。

这种实现可能存在[官方文档]([Using Box to Point to Data on the Heap - The Rust Programming Language (rust-lang.org)](https://doc.rust-lang.org/book/ch15-01-box.html#enabling-recursive-types-with-boxes))中通过`enum`递归地构造链表的例子，那样的解决方式。也即通过特化给模板定义一个递归的结束方式，这样的思路在早期C++的模板编程中也有用到，不过现在C++有了可变模版参数。但是而且和C++不同，Rust没法同名重载（据说这是为了避免因此产生的错误，但是在这里似乎表达能力被削弱了），我还没有想到实现的方法QAQ

### Trait Object? 不是最优解！

参考我之前的[一篇博客](/zh/blogs/20210120/)中记录的关于`Clone` trait的内容，我知道多用几个trait object是可以像下面这样搞出来的，但是这样显然是有成本问题的，因为要借助dynamic dispatch，Rust中的`dyn`指针是两倍空间开销，加上类似C++虚函数的调用方法，性能上有代价，我们这里其实也不需要运行期的多态。而且这样写读起来太恶心了……

```rust
pub trait Linkable: LinkClone{
    fn get_next(&self) -> Option<Box<dyn Linkable>>;
}

pub trait LinkAppend {
    fn append_next(&mut self, next: Box<dyn Linkable>) -> Box<dyn Linkable>;
}
pub trait LinkClone{
    fn clone_box(&self) -> Box<dyn Linkable>;
}

impl<T> LinkClone for T
where
    T: 'static + Linkable+ LinkAppend + Clone,
{
    fn clone_box(&self) -> Box<dyn Linkable> {
        Box::new(self.clone())
    }
}

impl Clone for Box<dyn Linkable> {
    fn clone(&self) -> Box<dyn Linkable> {
        self.clone_box()
    }
}
```

## 可行实现

最后推荐两种可行的实现

### 使用Associated Type

为`struct`实现这个`trait`的时候需要指定关联的类型到底是啥，可能不太灵活，但是大多数场合够用了。

但是这样还有一个坑就是，我们似乎没有办法写出来`Box<dyn Linkable>`

```rust
pub trait Linkable {
    type Next: Linkable;
    
    fn get_next(&self) -> Option<Self::Next>;
    fn append_next(&mut self, next: Self::Next) -> &Self;
}
```

```rust
impl Linkable for LinkNode {
    type Next = LinkNode;
    
    fn get_next(&self) -> Option<Box<LinkNode>> { 
        None
    }
    fn append_next(&mut self, next: LinkNode) -> &Self {
        self
    }
}
```

### 回避Trait的模板参数

这个方法其实和Associated Type很类似，但是它更加灵活，模板参数可以是任意的~

在我们的链表的例子里，这种实现可以支持*爸爸的爸爸是儿子的爷爷*这样的关系，但是你用Associated Type，*儿子就不认识爸爸的爸爸*了。

```rust
pub trait Linkable {
    fn get_next<T:Linkable>(&self) -> Next<T>; 
    fn append_next<T:Linkable>(&mut self, next: Next<T>) -> Self;
}

struct Next<T: Linkable> {
    node: T,
}
```

## 一个好用的crate

新发现了这个crate：[auto_enum](https://crates.io/crates/auto_enums)。

似乎是通过生成枚举变量返回多种类型的，貌似这个crate只能用在包含显示的分支处，因为需要分析你的代码。你需要确保返回类型是可枚举的。

生成代码的思路应该是和这个[问题](https://stackoverflow.com/questions/57066471/how-do-i-implement-a-trait-for-an-enum-and-its-respective-variants)差不多的，做一层包裹，然后通过模式匹配对不同的被包裹的类型，调用trait上对应的方法。

所以如果我们的struct类型数是可以枚举的，用这种方法也可行。但是还是比较麻烦的，如果想要新增实现了trait的类型，还需要去改动enum和在他上面trait的实现。



