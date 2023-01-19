---
title: Rust：克隆trait object？
description: Rust中克隆Trait Object遇到的坑
tags: 
- Rust
---


[[toc]]

# Rust：克隆trait object？

 最近遇到了这个问题，参考了[stack overflow](https://stackoverflow.com/questions/30353462/how-to-clone-a-struct-storing-a-boxed-trait-object)，顺便做一下记录和翻译。

## Trait Object

Trait及Trait Object最基础的内容可以回顾官方文档。

Trait Object实现的是**Dynamic Dispatch** 。这是一个术语，描述的是编译器在编译期时并不能知道调用哪个方法，只有在运行时才能确定的情况，也叫**late-binding**。

Trait Object通过在运行时提供具体的值来实现Dynamic Dispatch。Trait Object包含一个指向data指针和一个指向“vtable” 的指针。data 指针提供了trait object 存储的数据的地址，vtable 指针则指向了关联着实现了该trait的不同类型的vtable (“virtual method table”) ，其中存储着可以调用的方法（也就是虚函数表）。Trait objects有时也被称作type erasure，因为编译器并不清楚运行期时的具体类型。

注意我们这里讨论的是多态，和泛型不同。当然Rust在模板中，可以添加限制：trait bound，但是在运行时依然只能有一种类型。再具体一些，例如

```rust
pub struct GenericObject<T: Trait> {
    contents: Vec<Box<T>>
}
```

和

```rust
pub struct TraitObject {
    contents: Vec<Box<dyn Trait>>
}
```

是不同的。前者在实例化的时候，`contents`只能包含一种实现了`Trait`的类型，而后者的`contents`中可以包含任意实现了`Trait`的类型。

做个类比，trait及trait object类似Java中的interface或者C++的虚类的用法，Rust没有继承语义，所以通过这种`impl xx_trait for xx_struct` 的方式实现继承和多态；而trait bound则更接近C++中模板的concept概念，是一种模板特化的语法糖。

## 具体问题分析

在创建结构体的时候，我们可能想要在其中保存实现了某个trait的object，此时就需要用到trait object。例如下面的例子中，我们创建了一个名为Animal的trait，用来刻画动物应该具有的特征，他们需要能够讲话！于是提供了一个名为`speak`的接口。而另一个名为AnimalHouse的trait中，去实现一个动物们居住的房子，这个房子，显然是可以住进任何动物的，所以我们用`Box<dyn Animal>`来表示这里需要一个trait object，他需要实现Animal这个trait。

```Rust
trait Animal {
    fn speak(&self);
}

struct Dog {
    name: String,
}

impl Dog {
    fn new(name: &str) -> Dog {
        return Dog {
            name: name.to_string(),
        };
    }
}

impl Animal for Dog {
    fn speak(&self) {
        println!{"{}: ruff, ruff!", self.name};
    }
}

struct AnimalHouse {
    animal: Box<dyn Animal>,
}

fn main() {
    let house = AnimalHouse {
        animal: Box::new(Dog::new("Bobby")),
    };
    house.animal.speak();
}
```
首先，克隆一个 `Box` 其实不具有好的语义，因为它和 C++ 中的 `unique_ptr` 一般，具有独占的语义。
如果想要多个指针指向同一个对象，该使用 `Rc`，具有 `shared_ptr` 的语义。
那么这里的克隆显然是想要深拷贝一份。那直接 `(*box).clone()` 好不好呢？也不好，如下。

这个时候，如果我们想要复制`house`变量，如`house.clone()`就会报错，提示我们没有实现`Clone`Trait，但是当你给`AnimalHouse`和`Animal`都derive了一个，又会导致`Animal`类型`not object-safe [E0038]`，这是什么原因呢？事实上这个问题是`Clone` Trait导致的，我们直接做`&house as &Clone`也是无法进行类型转换的。 

因为`Clone`这个Trait本身是要求实现者是实现了`Sized`的Trait的，即在克隆时候，要保证大小是确定的，能够开辟等量的空间进行复制。但是`Clone`的方法`fn clone(&self) -> Self`和`fn clone_from(&mut self, source: &Self) `中，除了`self`以外的参数或返回值也含有`Self`类型。

回顾上面谈到的，trait object在实现的时候dynamic dispatch的，我们根本不知道这个trait object对应的实际类型，因为它可以是任何一个实现了该trait的类型的值，所以`Self`在这里的大小不是`Self: Sized`的，这样的trait是不能成为trait object的。

最开始给出的[stack overflow](https://stackoverflow.com/questions/30353462/how-to-clone-a-struct-storing-a-boxed-trait-object)中的老哥，给出了一个很有趣的解决方案。

```rust
trait Animal: AnimalClone {
    fn speak(&self);
}

// Splitting AnimalClone into its own trait allows us to provide a blanket
// implementation for all compatible types, without having to implement the
// rest of Animal.  In this case, we implement it for all types that have
// 'static lifetime (*i.e.* they don't contain non-'static pointers), and
// implement both Animal and Clone.  Don't ask me how the compiler resolves
// implementing AnimalClone for Animal when Animal requires AnimalClone; I
// have *no* idea why this works.
trait AnimalClone {
    fn clone_box(&self) -> Box<dyn Animal>;
}

impl<T> AnimalClone for T
where
    T: 'static + Animal + Clone,
{
    fn clone_box(&self) -> Box<dyn Animal> {
        Box::new(self.clone())
    }
}

// We can now implement Clone manually by forwarding to clone_box.
impl Clone for Box<dyn Animal> {
    fn clone(&self) -> Box<dyn Animal> {
        self.clone_box()
    }
}

#[derive(Clone)]
struct Dog {
    name: String,
}

impl Dog {
    fn new(name: &str) -> Dog {
        Dog {
            name: name.to_string(),
        }
    }
}

impl Animal for Dog {
    fn speak(&self) {
        println!("{}: ruff, ruff!", self.name);
    }
}

#[derive(Clone)]
struct AnimalHouse {
    animal: Box<dyn Animal>,
}

fn main() {
    let house = AnimalHouse {
        animal: Box::new(Dog::new("Bobby")),
    };
    let house2 = house.clone();
    house2.animal.speak();
}
```

也是挺离谱的，通过构造一个辅助的Trait `AnimalClone`，作为`Animal`的super trait，绕开object-safe的问题。

还有另一个解决方法：Rust中的`Box`智能指针类似于C++中的`unique_ptr`，唯一指向某个object，所以调用`clone()`的话我们必然是在克隆它指向的trait object。而类似`shared_ptr`，Rust也提供了`RC`智能指针，运行多个指针同时指向同一个object。因此一个可行的解决方法是将`Animal`类中`Box`指针换成`RC`，此时可以完成克隆。但是注意这里只是把指针克隆了一个，即新建了同一个指向trait object的指针，并没有实现对trait object的克隆。治标不治本！

部分内容也参考自：

- https://blog.knoldus.com/get-your-hands-wet-with-traits-object-of-rust/

- https://www.136.la/jiaocheng/show-7351.html

## 2023/01/05 更新

最近写 rocket 的中间件的时候又碰到了这个东西 = = Interesting

[Cloneable in rocket::route - Rust (docs.rs)](https://docs.rs/rocket/0.5.0-rc.2/rocket/route/trait.Cloneable.html)

看上去是 rocket 在管理路由的时候，在 `rocket::Route` 用了 `Box<dyn Handler>` 来存储任意实现了 `trait Handler` 的类型的句柄，因此在克隆的时候碰到了这个问题，于是采用了上面讨论的这种方法。