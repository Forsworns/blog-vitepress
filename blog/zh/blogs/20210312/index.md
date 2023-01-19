---
title: Rust 基础备忘
description: 大基本功
tags: 
- Rust
---


[[toc]]

# Rust 基础备忘

转载和记录一些印象不深的碎片知识

## String vs str

当我们需要引用一个被拥有的UTF-8文本的区间(range)，或者当我们使用字符串字面量(string literals)时，我们就需要使用字符串切片(也就是 `str`)。`&str` 不负责任地说，可以理解成 C++ 中的 `char *` 和 `string_view`。`string_view`是 C++17 中为解决字符串频繁拷贝问题而提出的 ，在一些只需要做查找、遍历、打印的函数中，参数的常量引用传递并不能完全解决拷贝问题，如果传参时候传的是常量引用传递，内部一旦使用赋值等运算仍然会发生拷贝，会在堆上重新分配空间浪费时间，所以它和`&str`都相当于是字符指针的包装类型，不拥有数据，只是划一个区间。

`String` 则可以认为和 C++ 中相同，是一个会自动分配空间的容器（而 Java 的 String 是常量）。

### 相互转化

像`println!`，`format!` 这些宏都是要传 `&str` 的。

`String` 转 `&str`：

- `String` 类型在引用时， `&String` 可以自动转化为 `&str`，编译器会帮忙干活，该特性叫 `deref coercing`
- 使用`&some_string[..]` 这样完整的写法，利用了String重载的Index操作
- `as_str()`，`as_ref()`，`as_borrow()`

`&str` 转 `String`：

- `into()` （这本质上是因为 `String` 实现了 `From<&'_ str>` 这个 trait ，调用了`to_owned()`
- to_owned()，因为原来没有所有权么，所以要 `to_owned` 成 `String` 拿到所有权
- `to_string()` 调用的是 `String::from()`
- `String::from()`

### 内存的分配

讨论内存分配的例子：

`let my_name = "Pascal".to_string();`

那么

```
buffer
                   /   capacity
                 /   /  length
               /   /   /
            +–––+–––+–––+
stack frame │ • │ 8 │ 6 │ <- my_name: String
            +–│–+–––+–––+
              │
            [–│–––––––– capacity –––––––––––]
              │
            +–V–+–––+–––+–––+–––+–––+–––+–––+
       heap │ P │ a │ s │ c │ a │ l │   │   │
            +–––+–––+–––+–––+–––+–––+–––+–––+

            [––––––– length ––––––––]
```

Rust会在栈上存储`String`对象。这个对象里包含以下三个信息: 一个**指针**指向一块分配在堆上的缓冲区，这也是数据真正存储的地方，数据的**容量**和**长度**。因此，`String`对象本身长度总是固定的三个字(word)。

如果我们只是对存储在`my_name`中的last name感兴趣，我们可以像下面这样来获取一个针对字符串中的特定部分的引用:

```rust
let mut my_name = "Pascal".to_string();
my_name.push_str( " Precht");
let last_name = &my_name[7..];
```

通过指定从第7个字节(因为有空格)开始一直到缓冲区的结尾("..")，`last_name`现在是一个引用自`my_name`拥有的文本的字符串切片(string slice)。它借用了这个文本。这里是它在内存中的样子:

```
my_name: String   last_name: &str
            [––––––––––––]    [–––––––]
            +–––+––––+––––+–––+–––+–––+
stack frame │ • │ 16 │ 13 │   │ • │ 6 │ 
            +–│–+––––+––––+–––+–│–+–––+
              │                 │
              │                 +–––––––––+
              │                           │
              │                           │
              │                         [–│––––––– str –––––––––]
            +–V–+–––+–––+–––+–––+–––+–––+–V–+–––+–––+–––+–––+–––+–––+–––+–––+
       heap │ P │ a │ s │ c │ a │ l │   │ P │ r │ e │ c │ h │ t │   │   │   │
            +–––+–––+–––+–––+–––+–––+–––+–––+–––+–––+–––+–––+–––+–––+–––+–––+
```

注意`last_name`没有在栈上存储容量信息。这是因为它只是对一个字符串切片的引用，而该字符串管理它的容量。这个字符串切片，即`str`本身，是不确定大小(unsized)的。 而且，在实际使用中，字符串切片总是以引用的形式出现，也就是它们的类型总是`&str`而不是`str`。

有两种情况我们需要使用字符串切片：要么创建一个对子字符串的引用，或者我们使用**字符串字面量**(string literals)。

一个字符串字面量由一串被双引号包含的文本创建，就像这样：

```rust
let my_name = "Pascal Precht"; // This is a `&str` not a `String`
```

下一个问题是，如果`&str`是一个引用了被(某人)拥有的`String`的切片，假定这个文本在适当的地方被创建，那么这么`String`的所有者是谁？

很显然，字符串字面量有点特殊。他们是引用自“预分配文本(preallocated text)”的字符串切片，这个预分配文本存储在可执行程序的只读内存中。换句话说，这是装载我们程序的内存并且不依赖于在堆上分配的缓冲区。

也就是说，栈上还有一个入口，指向当程序执行时预分配的内存。

```
my_name: &str
            [–––––––––––]
            +–––+–––+
stack frame │ • │ 6 │ 
            +–│–+–––+
              │                 
              +––+                
                 │
 preallocated  +–V–+–––+–––+–––+–––+–––+
 read-only     │ P │ a │ s │ c │ a │ l │
 memory        +–––+–––+–––+–––+–––+–––+
```

当我们对`String`和`&str`的区别有了更好的理解之后，另一个问题也就随之而来了。

### 应该使用哪一个？

显然，这取决于很多因素，但是一般地，保守来讲，如果我们正在构建的API不需要拥有或者修改使用的文本，那么应该使用`&str`而不是`String`。

## Life Time

仅在编译期存在，与运行无关

生命周期参数类似模板参数，可以任意指定名称，除了保留的 `'static`

当生命周期的名称不重要的时候，可以使用 `'_` 代表一个不具名的生命周期参数。

```rust
struct Config {
  ...
}

struct App {
    config: &Config
}
```

如果像上面这么直接用一个引用，无法通过编译，需要提供一个具名生命周期参数，如下

```rust
struct App<'a> {
    config: &'a Config
}
```

当提供了这样一个生命周期后，编译器可以保证引用类型 `&Config` 变量 `config` 和 `App` 具有相同的生命周期，所以不会出现野指针。即编译器会根据编程者对生命周期的描述，进行检查保证引用都会在声明周期之内。

回顾所有权的定义，在变量超出所有权上下文后，就会被自动 drop 掉，对于引用也是如此

```rust
fn main() {
    let r;
    {
        let x = 1;
        r = &x;
    }
    println!("{}", r)
}
```

该程序会报错 x 的生命周期不够长，在被 drop 后，r 仍然持有对 x 的引用。

### 引用传参

当传递引用时

```rust
fn some_function<'a>(val: &'a i32) {
    ...
}
```

 `some_function` 接收一个对于`i32` 类型的引用，随便给了一个生命周期参数`'a`。于是编译器就知道`some_function` 不会也不应该去把 `val` 存储到任何一个可能超出该函数生命周期的地方。

如果 `some_function` 采用生命周期参数`'static`就不同了，Rust 会认为该参数是一个全局变量。这种情况下，只有`static` 变量才能作为函数参数。

### 返回引用

```rust
fn smallest_number<'a>(n: &'a [i32]) -> &'a i32 {
    let mut s = &n[0];
    for r in &n[1..] {
        if r < s {
            s = r;
        }
    }
    s
}
```

上面的生命周期标识表明返回值和参数的生命周期是相同的，在调用函数处，如果输入参数的生命周期结束了，返回值也就不能再被引用了。事实上，上面的代码中不显式地标明生命周期参数也可以，编译器会自动完成推导。

```rust
let s;
{
    let numbers = [2, 4, 1, 0, 9];
    s = smallest_number(&numbers);
}
println!("{}", s)
```

也就是说，这段代码会报错，因为在括号外，`numbers`  被 drop 掉了，所以 `s`也就无法引用函数返回值了。

### 结构体

也就是一开始的那段代码。为什么编译器不能自动帮我们拓展一下生命周期？事实上在早期的编译器实现中，确实是这么干的，但是开发者发现有时会引发歧义，不如明确标识出引用的生命周期。

需要注意的是，当前面代码中的 `App`结构体被其他类型借用时，也需要提供生命周期参数，即

```rust
struct Platform<'a> {
    app: App<'a>
}
```

### 多个生命周期参数

考虑下面两种定义，第二种才是符合调用时要求的定义

```rust
/// The same lifetime annotation
struct Point<'a> {
    x: &'a i32,
    y: &'a i32
}
/// Different lifetime annotation
struct Point<'a, 'b> {
    x: &'a i32,
    y: &'b i32
}
```

```rust
fn main() {
    let x = 3;
    let r;
    {
        let y = 4;
        let point = Point { x: &x, y: &y };
        r = point.x
    }
    println!("{}", r);
}
```

在第一种定义下，编译器会自动选择更短的生命周期，即成员`x` 和 `y` 都会被当做 `y` 的生命周期。

## Trait

- Trait 比较烦的一点是在使用相关的类的时候，记得把它实现的 trait 也要 use 到。
- 递归相关的 trait、复制相关的 trait 遇到问题可以回顾过往的笔记。

## 与 C++ 结合

标准库中几个常用的
- std::os::raw
- std::ffi

http://crates.io/ 上的库

- clib
- inx

`std::io::Error::last_os_error` 这个函数，是用来捕获函数操作失败后，内核反馈给我们的错误。





## 杂项

- 关键字 `ref`，`deref` 等价于 `&` 和 `*`，即

    ```rust
    let a = &3u8 ;
    let ref b = 3u8;
    assert_eq!(*a,*b);
    ```

- 2018 版里，不用 `extern crate` 了，可以直接 `use`

## 安全性

> If it compiles, then it works.

### C++的情况

C++把内存使用分为两种情况：值对象和指针对象。值语义的对象超出作用域会自动调用析构函数销毁，传递或者赋值的时候会进行一次拷贝。指针语义则交给人肉来管理，或者使用智能指针来引用计数。值对象在传递赋值中拷贝一次比较浪费，所以C++后来有了移动构造函数。值在移动以后，关联的数据移动到新值。

### Rust是怎么做的

Rust则是在C++的基础上进一步优化。Rust的对象有一个所有者，和多个引用。Rust只允许值有一个所有者，传递和赋值会导致所有权移动。这看起来像C++的 `unique_ptr`，但实际上更像C++的移动语义。也就是说C++拷贝是隐式的移动是显式的，Rust移动是隐式的。当然Rust在这里有编译器的静态分析，没有运行时开销。很多地方并不想移动值，只是借用一下，Rust也使用了引用的概念，来表达指针语义。一个常见内存问题是指针指向了一个无效的内存地址，Rust却没这个问题。Rust编译器强制让你证明值的生命周期大于它的引用的生命周期。有些编译器搞不清楚的地方需要添加生命周期标记，来告诉编译器。

## References

[String vs str in Rust](https://blog.thoughtram.io/string-vs-str-in-rust/)

[知乎专栏：使用套接字联网 API](https://zhuanlan.zhihu.com/p/61652809)