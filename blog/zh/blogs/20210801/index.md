---
title: 转载：谈元编程与表达能力
description: 很有趣的文章，之前那篇讨论泛型，这里讨论宏
tags: 
- 转载
- 宏学家
- Polyglot
---

[[toc]]

# 谈元编程与表达能力

本文转载自[谈元编程与表达能力 - 面向信仰编程 (draveness.me)](https://draveness.me/metaprogramming/)，最开始是关注作者公众号“真没什么逻辑”，找到他的博客的，是大佬。

在这篇文章中，作者会介绍不同的编程语言如何增强自身的表达能力，在写这篇文章的时候其实就已经想到这可能不是一篇有着较多受众和读者的文章。不过作者仍然想跟各位读者分享一下对不同编程语言的理解，同时也对自己的知识体系进行简单的总结。

![metaprogramming](2017-12-10-metaprogramming.png)

当我们刚刚开始学习和了解编程这门手艺或者说技巧时，一切的知识与概念看起来都非常有趣，随着学习的深入和对语言的逐渐了解，我们可能会发现原来看起来无所不能的编程语言成为了我们的限制，尤其是在我们想要使用一些**元编程**技巧的时候，你会发现有时候语言限制了我们的能力，我们只能一遍一遍地写重复的代码来解决本可以轻松搞定的问题。

## 元编程

元编程（Metaprogramming）是计算机编程中一个非常重要、有趣的概念，[维基百科](https://en.wikipedia.org/wiki/Metaprogramming) 上将元编程描述成一种计算机程序可以**将代码看待成数据**的能力。

> Metaprogramming is a programming technique in which computer programs have the ability to treat programs as their data.

如果能够将代码看做数据，那么代码就可以像数据一样在运行时被修改、更新和替换；元编程赋予了编程语言更加强大的表达能力，能够让我们将一些计算过程从运行时挪到编译时、通过编译期间的展开生成代码或者允许程序在运行时改变自身的行为。

![metaprogramming-usage](2017-12-10-metaprogramming-usage.png)

总而言之，**元编程其实是一种使用代码生成代码的方式**，无论是编译期间生成代码，还是在运行时改变代码的行为都是『生成代码』的一种，下面的代码其实就可以看作一种最简单的元编程技巧：

```c
int main() {
    for(int i = 0; i < 10; i++) {
        char *echo = (char*)malloc(6 * sizeof(char));
        sprintf(echo, "echo %d", i);
        system(echo);
    }
    return 0;
}
```

这里的代码其实等价于执行了以下的 shell 脚本，也可以说这里使用了 C 语言的代码生成来生成 shell 脚本：

```shell
echo 0
echo 1
...
echo 9
```

## 编译时和运行时

现代的编程语言大都会为我们提供不同的元编程能力，从总体来看，根据『生成代码』的时机不同，我们将元编程能力分为两种类型，其中一种是编译期间的元编程，例如：宏和模板；另一种是运行期间的元编程，也就是运行时，它赋予了编程语言在运行期间修改行为的能力，当然也有一些特性既可以在编译期实现，也可以在运行期间实现。

![compile-and-execute](2017-12-10-compile-and-execute.png)

不同的语言对于泛型就有不一样的实现，Java 的泛型就是在编译期间实现的，它的泛型其实是伪泛型，在编译期间所有的泛型就会被编译器擦除（type erasure），生成的 Java 字节码是不包含任何的泛型信息的，但是 C# 对于泛型就有着不同的实现了，它的泛型类型在运行时进行替换，为实例化的对象保留了泛型的类型信息。

> C++ 的模板其实与这里讨论的泛型有些类似，它会为每一个具体类型生成一份独立的代码，而 Java 的泛型只会生成一份经过类型擦除后的代码，总而言之 C++ 的模板完全是在编译期间实现的，而 Java 的泛型是编译期间和运行期间协作产生的；模板和泛型虽然非常类似，但是在这里提到的模板大都特指 C++ 的模板，而泛型这一概念其实包含了 C++ 的模板。

虽然泛型和模板为各种编程语言提供了非常强大的表达能力，但是在这篇文章中，我们会介绍另外两种元编程能力：*宏*和*运行时*，前者是在编译期间完成的，而后者是在代码运行期间才发生的。

## 宏（Macro）

宏是很多编程语言具有的特性之一，它是一个将输入的字符串映射成其他字符串的过程，这个映射的过程也被我们称作宏展开。

![macro-expansion](2017-12-10-macro-expansion.png)

宏其实就是一个在编译期间中定义的展开过程，通过预先定义好的宏，我们可以使用少量的代码完成更多的逻辑和工作，能够减少应用程序中大量的重复代码。

很多编程语言，尤其是编译型语言都实现了宏这个特性，包括 C、Elixir 和 Rust，然而这些语言却使用了不同的方式来实现宏；我们在这里会介绍两种不同的宏，一种是基于文本替换的宏，另一种是基于语法的宏。

![different-kinds-of-macros](2017-12-10-different-kinds-of-macros.png)

C、C++ 等语言使用基于文本替换的宏，而类似于 Elixir、Rust 等语言的宏系统其实都是基于语法树和语法元素的，它的实现会比前者复杂很多，应用也更加广泛。

在这一节的剩余部分，我们会分别介绍 C、Elixir 和 Rust 三种不同的编程语言实现的宏系统，它们的使用方法、适用范围和优缺点。

### C

作者相信很多工程师入门使用的编程语言其实都是 C 语言，而 C 语言的宏系统看起来还是相对比较简单的，虽然在实际使用时会遇到很多非常诡异的问题。C 语言的宏使用的就是文本替换的方式，所有的宏其实并不是通过编译器展开的，而是由预编译器来处理的。

![preprocesso](2017-12-10-preprocessor.png)

编译器 GCC 根据『长相』将 C 语言中的宏分为两种，其中的一种宏与编程语言中定义变量非常类似：

```c
#define BUFFER_SIZE 1024

char *foo = (char *)malloc(BUFFER_SIZE);
char *foo = (char *)malloc(1024);
```

这些宏的定义就是一个简单的标识符，它们会在预编译的阶段被预编译器替换成定义后半部分出现的**字符**，这种宏定义其实比较类似于变量的声明，我们经常会使用这种宏定义替代一些无意义的数字，能够让程序变得更容易理解。

另一种宏定义就比较像对函数的定义了，与其他 C 语言的函数一样，这种宏在定义时也会包含一些宏的参数：

```c
#define plus(a, b) a + b
#define multiply(a, b) a * b
```

通过在宏的定义中引入参数，宏定义的内部就可以直接使用对应的标识符引入外界传入的参数，在定义之后我们就可以像使用函数一样使用它们：

```c
#define plus(a, b) a + b
#define multiply(a, b) a * b

int main(int argc, const char * argv[]) {
    printf("%d", plus(1, 2));       // => 3
    printf("%d", multiply(3, 2));   // => 6
    return 0;
}
```

上面使用宏的代码与下面的代码是完全等价的，在预编译阶段之后，上面的代码就会被替换成下面的代码，也就是编译器其实是不负责宏展开的过程：

```c
int main(int argc, const char * argv[]) {
    printf("%d", 1 + 2);    // => 3
    printf("%d", 3 * 2);    // => 6
    return 0;
}
```

宏的作用其实非常强大，基于文本替换的宏能做到很多函数无法做到的事情，比如使用宏根据传入的参数创建类并声明新的方法：

```c
#define pickerify(KLASS, PROPERTY) interface \
    KLASS (Night_ ## PROPERTY ## _Picker) \
    @property (nonatomic, copy, setter = dk_set ## PROPERTY ## Picker:) DKColorPicker dk_ ## PROPERTY ## Picker; \
    @end \
    @implementation \
    KLASS (Night_ ## PROPERTY ## _Picker) \
    - (DKColorPicker)dk_ ## PROPERTY ## Picker { \
        return objc_getAssociatedObject(self, @selector(dk_ ## PROPERTY ## Picker)); \
    } \
    - (void)dk_set ## PROPERTY ## Picker:(DKColorPicker)picker { \
        objc_setAssociatedObject(self, @selector(dk_ ## PROPERTY ## Picker), picker, OBJC_ASSOCIATION_COPY_NONATOMIC); \
        [self setValue:picker(self.dk_manager.themeVersion) forKeyPath:@keypath(self, PROPERTY)];\
        NSMutableDictionary *pickers = [self valueForKeyPath:@"pickers"];\
        [pickers setValue:[picker copy] forKey:_DKSetterWithPROPERTYerty(@#PROPERTY)]; \
    } \
    @end

@pickerify(Button, backgroundColor);
```

上面的代码是我在一个 iOS 的开源库 [DKNightVersion](https://github.com/Draveness/DKNightVersion/blob/master/DKNightVersion/DKNightVersion.h#L57-L72) 中使用的代码，通过宏的文本替换功能，我们在这里创建了类、属性并且定义了属性的 getter/setter 方法，然而使用者对此其实是一无所知的。

C 语言中的宏只是提供了一些文本替换的功能再加上一些高级的 API，虽然它非常强大，但是强大的事物都是一把双刃剑，再加上 C 语言的宏从实现原理上就有一些无法避免的缺陷，所以在使用时还是要非常小心。

由于预处理器只是对宏进行替换，并没有做任何的语法检查，所以在宏出现问题时，编译器的报错往往会让我们摸不到头脑，不知道哪里出现了问题，还需要脑内对宏进行展开分析出现错误的原因；除此之外，类似于 `multiply(1+2, 3)` 的展开问题导致人和机器对于同一段代码的理解偏差，作者相信也广为人知了；更高级一些的**分号吞噬**、**参数的重复调用**以及**递归引用时不会递归展开**等问题其实在这里也不想多谈。

```c
multiply(1+2, 3) // #=> 1+2 * 3
```

#### 卫生宏

然而 C 语言宏的实现导致的另一个问题却是非常严重的：

```c
#define inc(i) do { int a = 0; ++i; } while(0)

int main(int argc, const char * argv[]) {
    int a = 4, b = 8;
    inc(a);
    inc(b);
    printf("%d, %d\n", a, b); // => 4, 9 !!
    return 0;
}
```

> 这一小节与卫生宏有关的 C 语言代码取自 [Hygienic macro](https://en.wikipedia.org/wiki/Hygienic_macro) 中的代码示例。

上述代码中的 `printf` 函数理应打印出 `5, 9` 然而却打印出了 `4, 9`，我们来将上述代码中使用宏的部分展开来看一下：

```c
int main(int argc, const char * argv[]) {
    int a = 4, b = 8;
    do { int a = 0; ++a; } while(0);
    do { int a = 0; ++b; } while(0);
    printf("%d, %d\n", a, b); // => 4, 9 !!
    return 0;
}
```

这里的 `a = 0` 按照逻辑应该不发挥任何的作用，但是在这里却覆盖了上下文中 `a` 变量的值，导致父作用域中变量 `a` 的值并没有 `+1`，这其实就是因为 C 语言中实现的宏不是*卫生宏*（Hygiene macro）。

作者认为卫生宏（Hygiene macro）是一个非常让人困惑的翻译，它其实指一些**在宏展开之后不会意外捕获上下文中标识符的宏**，从定义中我们就可以看到 C 语言中的宏明显不是卫生宏，而接下来要介绍的两种语言的宏系统就实现了卫生宏。

### Elixir

Elixir 是一门动态的函数式编程语言，它被设计用来构建可扩展、可维护的应用，所有的 Elixir 代码最终都会被编译成二进制文件运行在 Erlang 的虚拟机 Beam 上，构建在 Erlang 上的 Elixir 也继承了很多 Erlang 的优秀特性。然而在这篇文章中并不会展开介绍 Elixir 语言以及它的某些特点和应用，我们只想了解 Elixir 中的宏系统是如何使用和实现的。

![elixir-logo](2017-12-10-elixir-logo.png)

宏是 Elixir 具有强大表达能力的一个重要原因，通过内置的宏系统可以减少系统中非常多的重复代码，我们可以使用 `defmacro` 定义一个宏来实现 `unless` 关键字：

```elixir
defmodule Unless do
  defmacro macro_unless(clause, do: expression) do
    quote do
      if(!unquote(clause), do: unquote(expression))
    end
  end
end
```

Elixir

这里的 `quote` 和 `unquote` 是宏系统中最重要的两个函数，你可以从字面上理解 `quote` 其实就是在一段代码的两侧加上双引号，让这段代码变成字符串，而 `unquote` 会将传入的多个参数的文本**原封不动**的插入到相应的位置，你可以理解为 `unquote` 只是将 `clause` 和 `expression` 代表的字符串当做了返回值。

```elixir
Unless.macro_unless true, do: IO.puts "this should never be printed"
```

上面的 Elixir 代码在真正执行之前会被替换成一个使用 `if` 的表达式，我们可以使用下面的方法获得宏展开之后的代码：

```elixir
iex> expr = quote do: Unless.macro_unless true, do: IO.puts "this should never be printed"
iex> expr |> Macro.expand_once(__ENV__) |> Macro.to_string |> IO.puts
if(!true) do
  IO.puts("this should never be printed")
end
:ok
```

当我们为 `quote` 函数传入一个表达式的时候，它会将当前的表达式转换成一个抽象语法树：

```elixir
{% raw %}{{:., [], [{:__aliases__, [alias: false], [:Unless]}, :macro_unless]}, [],
 [true,
  [do: {{:., [], [{:__aliases__, [alias: false], [:IO]}, :puts]}, [],
    ["this should never be printed"]}]]}{% endraw %}
```

在 Elixir 中，抽象语法数是可以直接通过下面的 `Code.eval_quoted` 方法运行：

```elixir
iex> Code.eval_quoted [expr]
** (CompileError) nofile:1: you must require Unless before invoking the macro Unless.macro_unless/2
    (elixir) src/elixir_dispatch.erl:97: :elixir_dispatch.dispatch_require/6
    (elixir) lib/code.ex:213: Code.eval_quoted/3
iex> Code.eval_quoted [quote(do: require Unless), expr]
{[Unless, nil], []}
```

我们只运行当前的语法树，我们会发现当前的代码由于 `Unless` 模块没有加载导致宏找不到报错，所以我们在执行 `Unless.macro_unless` 之前需要先 `require` 对应的模块。

![elixir-macro](2017-12-10-elixir-macro.png)

在最开始对当前的宏进行定义时，我们就会发现宏其实输入的是一些语法元素，实现内部也通过 `quote` 和 `unquote` 方法对当前的语法树进行修改，最后返回新的语法树：

```elixir
{% raw %}defmacro macro_unless(clause, do: expression) do
  quote do
    if(!unquote(clause), do: unquote(expression))
  end
end

iex> expr = quote do: Unless.macro_unless true, do: IO.puts "this should never be printed"
{{:., [], [{:__aliases__, [alias: false], [:Unless]}, :macro_unless]}, [],
 [true,
  [do: {{:., [], [{:__aliases__, [alias: false], [:IO]}, :puts]}, [],
    ["this should never be printed"]}]]}

iex> Macro.expand_once expr, __ENV__
{:if, [context: Unless, import: Kernel],
 [{:!, [context: Unless, import: Kernel], [true]},
  [do: {{:., [],
     [{:__aliases__, [alias: false, counter: -576460752303422687], [:IO]},
      :puts]}, [], ["this should never be printed"]}]]}{% endraw %}
```

Elixir 中的宏相比于 C 语言中的宏更强大，这是因为它不是对代码中的文本直接进行替换，它能够为我们直接提供操作 Elixir 抽象语法树的能力，让我们能够参与到 Elixir 的编译过程，影响编译的结果；除此之外，Elixir 中的宏还是卫生宏（Hygiene Macro），宏中定义的参数并不会影响当前代码执行的上下文。

```elixir
defmodule Example do
  defmacro hygienic do
    quote do
      val = 1
    end
  end
end

iex> val = 42
42
iex> Example.hygienic
1
iex> val
42
```

在上述代码中，虽然宏内部的变量与当前环境上下文中的变量重名了，但是宏内部的变量并没有影响上下文中 `val` 变量的变化，所以 Elixir 中宏系统是『卫生的』，如果我们真的想要改变上下文中的变量，可以使用 `var!` 来做这件事情：

```elixir
defmodule Example do
  defmacro unhygienic do
    quote do
      var!(val) = 2
    end
  end
end

iex> val = 42
42
iex> Example.unhygienic
2
iex> val
2
```

相比于使用文本替换的 C 语言宏，Elixir 的宏系统解决了很多问题，例如：卫生宏，不仅如此，Elixir 的宏还允许我们修改当前的代码中的语法树，提供了更加强大的表达能力。

### Rust

Elixir 的宏系统其实已经足够强大了，不止避免了基于文本替换的宏带来的各种问题，我们还可以直接使用宏操作上下文的语法树，作者在一段时间内都觉得 Elixir 的宏系统是接触到的最强大的宏系统，直到开始学习 [Rust](https://www.rust-lang.org/en-US/) 才发现更复杂的宏系统。

![rust-logo](2017-12-10-rust-logo.png)

Rust 是一门非常有趣的编程语言，它是一门有着极高的性能的系统级的编程语言，能够避免当前应用中发生的段错误并且保证线程安全和内存安全，但是这些都不是我们今天想要关注的事情，与 Elixir 一样，在这篇文章中我们仅仅关心 Rust 的宏系统到底是什么样的：

```rust
macro_rules! foo {
    (x => $e:expr) => (println!("mode X: {}", $e));
    (y => $e:expr) => (println!("mode Y: {}", $e));
}
```

上面的 Rust 代码定义了一个名为 `foo` 的宏，我们在代码中需要使用 `foo!` 来调用上面定义的宏：

```rust
fn main() {
    foo!(y => 3); // => mode Y: 3
}
```

上述的宏 `foo` 的主体部分其实会将传入的**语法元素**与宏中的条件进行模式匹配，如果匹配到了，就会返回条件右侧的表达式，到这里其实与 Elixir 的宏系统没有太大的区别，Rust 宏相比 Elixir 更强大主要在于其提供了更加灵活的匹配系统，在宏 `foo` 的定义中使用的 `$e:expr` 就会匹配一个表达式并将表达式绑定到 `$e` 这个上下文的变量中，除此之外，在 Rust 中我们还可以组合使用以下的匹配符：

![rust-macro-matcher-and-example](2017-12-10-rust-macro-matcher-and-example.png)

为了实现功能更强大的宏系统，Rust 的宏还提供了重复操作符和递归宏的功能，结合这两个宏系统的特性，我们能直接使用宏构建一个生成 HTML 的 DSL：

```rust
{% raw %}macro_rules! write_html {
    ($w:expr, ) => (());

    ($w:expr, $e:tt) => (write!($w, "{}", $e));

    ($w:expr, $tag:ident [ $($inner:tt)* ] $($rest:tt)*) => {{
        write!($w, "<{}>", stringify!($tag));
        write_html!($w, $($inner)*);
        write!($w, "</{}>", stringify!($tag));
        write_html!($w, $($rest)*);
    }};
}{% endraw %}
```

在上述的 `write_html` 宏中，我们总共有三个匹配条件，其中前两个是宏的终止条件，第一个条件不会做任何的操作，第二个条件会将匹配到的 Token 树求值并写回到传入的字符串引用 `$w` 中，最后的条件就是最有意思的部分了，在这里我们使用了形如的 `$(...)*` 语法来**匹配零个或多个相同的语法元素**，例如 `((inner:tt)*` 就是匹配零个以上的 Token 树（tt）；在右侧的代码中递归调用了 `write_html` 宏并分别传入 `((inner)*` 和 `((rest)*` 两个参数，这样我们的 `write_html` 就能够解析 DSL 了。

有了 `write_html` 宏，我们就可以直接使用形如 `html[head[title["Macros guide"]]` 的代码返回如下所示的 HTML：

```html
<html><head><title>Macros guide</title></head></html>
```

> 这一节中提供的与 Rust 宏相关的例子都取自 [官方文档](https://doc.rust-lang.org/book/first-edition/macros.html) 中对宏的介绍这一部分内容。

Rust 的宏系统其实是基于一篇 1986 年的论文 [Macro-by-Example](https://www.cs.indiana.edu/ftp/techreports/TR206.pdf) 实现的，如果想要深入了解 Rust 的宏系统可以阅读这篇论文；Rust 的宏系统确实非常完备也足够强大，能够做很多我们使用 C 语言宏时无法做到的事情，极大地提高了语言的表达能力。

## 运行时（Runtime）

宏是一种能在程序执行的预编译或者编译期间改变代码行为的能力，通过编译期的处理过程赋予编程语言元编程能力；而运行时，顾名思义一般是指**面向对象**的编程语言在程序运行的某一个时间的上下文，在这里我们想要介绍的运行时可以理解为**能够在运行期间改变对象行为的机制**。

![phases](2017-12-10-phases.png)

当相应的行为在当前对象上没有被找到时，运行时会提供一个改变当前对象行为的入口，在篇文章中提到的运行时不是广义上的运行时系统，它特指**面向对象语言在方法决议的过程中为外界提供的入口，让工程师提供的代码也能参与到当前的方法决议和信息发送的过程**。

在这一节中，我们将介绍的两个使用了运行时的面向对象编程语言 Objective-C 和 Ruby，它们有着相似的消息发送的流程，但是由于 OOP 模型实现的不同导致方法调用的过程稍微有一些差别；除此之外，由于 Objective-C 是需要通过编译器编译成二进制文件才能执行的，而 Ruby 可以直接被各种解释器运行，所以两者的元编程能力也会受到这一差别的影响，我们会在下面展开进行介绍。

### Objective-C

Objective-C 是一种通用的面向对象编程语言，它将 Smalltalk 消息发送的语法引入了 C 语言；ObjC 语言的面向对象模型其实都是运行在 ObjC Runtime 上的，整个运行时也为 ObjC 提供了方法查找的策略。

![objc-class-hierachy](2017-12-10-objc-class-hierachy.png)

如上图所示，我们有一个 `Dog` 类的实例，当我们执行了 `dog.wtf` 方法时，运行时会先向右再向上的方式在整个继承链中查找相应的方法是否存在，如果当前方法在整个继承链中都完全不存在就会进入**动态方法决议**和**消息转发**的过程。

![objc-message-resolution-and-forwarding](2017-12-10-objc-message-resolution-and-forwarding.png)

> 上述图片取自 [从代理到 RACSignal](https://draveness.me/racdelegateproxy)，使用时对图片中的颜色以及字号稍作修改。

当 ObjC 的运行时在方法查找的过程中已经查找到了上帝类 `NSObject` 时，仍然没有找到方法的实现就会进入上面的流程，先执行的 `+resolveInstanceMethod:` 方法就是一个可以为当前的类添加方法的入口：

```objc
void dynamicMethodIMP(id self, SEL _cmd) { }

+ (BOOL)resolveInstanceMethod:(SEL)aSEL {
    if (aSEL == @selector(resolveThisMethodDynamically)) {
          class_addMethod([self class], aSEL, (IMP) dynamicMethodIMP, "v@:");
          return YES;
    }
    return [super resolveInstanceMethod:aSel];
}
```

在这里可以通过 `class_addMethod` 动态的为当前的类添加新的方法和对应的实现，如果错过了这个入口，我们就进入了消息转发的流程；在这里，我们有两种选择，一种情况是通过 `-forwardTargetForSelector:` 将当前方法的调用直接转发到其他方法上，另一种就是组合 `-methodSignatureForSelector:` 和 `-forwardInvocation:` 两个方法，直接执行一个 `NSInvocation` 对象。

```objc
- (void)forwardInvocation:(NSInvocation *)anInvocation {
    if ([someOtherObject respondsToSelector:[anInvocation selector]]) {
        [anInvocation invokeWithTarget:someOtherObject];
    } else {
        [super forwardInvocation:anInvocation];
    }
}
```

`-forwardTargetForSelector:` 方法只能简单地将方法直接转发给其他的对象，但是在 `-forwardInvocation:` 中我们可以得到一个 `NSInvocation` 实例，可以自由地选择需要执行哪些方法，并修改当前方法调用的上下文，包括：方法名、参数和目标对象。

虽然 Objective-C 的运行时系统能够为我们提供动态方法决议的功能，也就是某一个方法在编译期间哪怕不存在，我们也可以在运行时进行调用，这虽然听起来很不错，在很多时候我们都可以通过 `-performSelector:` 调用**编译器看起来不存的方法**，但是作为一门执行之前需要编译的语言，如果我们在 `+resolveInstanceMethod:` 中确实动态实现了一些方法，但是编译器在编译期间对这一切都毫不知情。

```objc
void dynamicMethodIMP(id self, SEL _cmd) { }
+ (BOOL)resolveInstanceMethod:(SEL)aSEL {
    NSString *selector = NSStringFromSelector(aSEL);
    if ([selector hasPrefix:@"find"]) {
          class_addMethod([self class], aSEL, (IMP) dynamicMethodIMP, "v@:");
          return YES;
    }
    return [super resolveInstanceMethod:aSel];
}

- (void)func {
    [self findFoo];
    [self findBar];
    [self find];
}
```

从 `-func` 中调用的三个以 `find` 开头的方法其实会在运行期间添加到当前类上，但是编译器在编译期间对此一无所知，所以它会提示编译错误，在编译期间将可以运行的代码拦截了下来，这样的代码如果跳过编译器检查，直接运行是不会出问题的，但是代码的执行必须通过编译器编译，这一过程是无法跳过的。

![objc-compile-and-execute](2017-12-10-objc-compile-and-execute.png)

我们只能通过 `-performSelector:` 方法绕过编译器的检查，不过使用 `-performSelector:` 会为代码添加非常多的噪音：

```objc
- (void)func {
    [self performSelector:@selector(findFoo)];
    [self performSelector:@selector(findBar)];
    [self performSelector:@selector(find)];
}
```

所以虽然 Objective-C 通过运行时提供了比较强大的元编程能力，但是由于代码执行时需要经过编译器的检查，所以在很多时候我们都没有办法直接发挥运行时为我们带来的好处，需要通过其他的方式完成方法的调用。

### Ruby

除了 Objective-C 之外，Ruby 也提供了一些相似的运行时修改行为的特性，它能够在运行时修改自身特性的功能还是建立在它的 OOP 模型之上；Ruby 提供了一些在运行期间能够改变自身行为的入口和 API 可以帮助我们快速为当前的类添加方法或者实例变量。

![ruby-class-hierachy](2017-12-10-ruby-class-hierachy.png)

当我们调用 `Dog` 实例的一个方法时，Ruby 会先找到当前对象的类，然后在由 `superclass` 构成的链上查找并调用相应的方法，这是 OOP 中非常常见的，**向右再向上**的方法查找过程。

与 Objective-C 几乎相同，Ruby 也提供了类似与 `+resolveInstanceMethod:` 的方法，如果方法在整个继承链上都完全不存在时，就会调用 `#method_missing` 方法，并传入与这次方法调用有关的参数：

```ruby
def method_missing(method, *args, &block)
end
```

传入的参数包括方法的符号，调用原方法时传入的参数和 block，在这里我们就可以为当前的类添加方法了：

```ruby
class Dog
  def method_missing(m, *args, &block)
    if m.to_s.start_with? 'find'
      define_singleton_method(m) do |*args|
        puts "#{m}, #{args}"
      end
      send(m, *args, &block)
    else
      super
    end
  end
end
```

通过 Ruby 提供的一些 API，例如 `define_method`、`define_singleton_method` 我们可以直接在运行期间快速改变对象的行为，在使用时也非常简单：

```ruby
pry(main)> d = Dog.new
=> #<Dog:0x007fe31e3f87a8>
pry(main)> d.find_by_name "dog"
find_by_name, ["dog"]
=> nil
pry(main)> d.find_by_name "dog", "another_dog"
find_by_name, ["dog", "another_dog"]
=> nil
```

当我们调用以 `find` 开头的实例方法时，由于在当前实例的类以及父类上没有实现，所以就会进入 `#method_missing` 方法并为**当前实例**定义新的方法 `#find_by_name`。

> 注意：当前的 `#find_by_name` 方法只是定义在当前实例上的，存储在当前实例的单类上。

由于 Ruby 是脚本语言，解释器在脚本执行之前不会对代码进行检查，所以哪怕在未执行期间并不存在的 `#find_by_name` 方法也不会导致解释器报错，在运行期间通过 `#define_singleton_method` 动态地 定义了新的 `#find_by_name` 方法修改了对象的行为，达到了为对象批量添加相似功能的目的。

## 总结

在文章中介绍的两种不同的元编程能力，宏系统和运行时，前者通过预先定义好的一些宏规则，在预编译和编译期间对代码进行展开和替换，而后者提供了在运行期间改变代码行为的能力，两种方式的本质都是通过少量的代码生成一些非常相似的代码和逻辑，能够增强编程语言的表达能力并减少开发者的工作量。

无论是宏还是运行时其实都是简化程序中代码的一种手段，归根结底就是一种使用代码生成代码的思想，如果我们能够掌握这种元编程的思想并在编程中熟练的运用就能够很好地解决程序中一些诡异的问题，还能消灭重复的代码，提高我们运用以及掌控编程语言的能力，能够极大地增强编程语言的表达能力，所以元编程确实是一种非常重要并且需要学习的思想。

## Reference

- [Metaprogramming](https://en.m.wikipedia.org/wiki/Metaprogramming)
- [C++ 模板和 C# 泛型之间的区别（C# 编程指南）](https://docs.microsoft.com/zh-cn/dotnet/csharp/programming-guide/generics/differences-between-cpp-templates-and-csharp-generics)
- [C++ 模板和 Java 泛型有什么异同？](https://www.zhihu.com/question/33304378)
- [Macro (computer science)](https://en.wikipedia.org/wiki/Macro_(computer_science))
- [Macros · Elixir Doc](https://elixir-lang.org/getting-started/meta/macros.html)
- [Macros · GCC](https://gcc.gnu.org/onlinedocs/cpp/Macros.html)
- [C 语言宏的特殊用法和几个坑](http://hbprotoss.github.io/posts/cyu-yan-hong-de-te-shu-yong-fa-he-ji-ge-keng.html)
- [Hygienic macro](https://en.wikipedia.org/wiki/Hygienic_macro)
- [Metaprogramming · ElixirSchool](https://elixirschool.com/en/lessons/advanced/metaprogramming/)
- [Macros · Rust Doc](https://doc.rust-lang.org/book/first-edition/macros.html)
- [Macro-by-Example](https://www.cs.indiana.edu/ftp/techreports/TR206.pdf)
- [Rust](https://www.rust-lang.org/en-US/)
- [从源代码看 ObjC 中消息的发送](https://draveness.me/message)
- [Dynamic Method Resolution](https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/ObjCRuntimeGuide/Articles/ocrtDynamicResolution.html)
- [Message Forwarding](https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/ObjCRuntimeGuide/Articles/ocrtForwarding.html#//apple_ref/doc/uid/TP40008048-CH105-SW1)
- [从代理到 RACSignal](https://draveness.me/racdelegateproxy)
- [resolveInstanceMethod(_:)](https://developer.apple.com/documentation/objectivec/nsobject/1418500-resolveinstancemethod)
- [Ruby Method Missing](http://rubylearning.com/satishtalim/ruby_method_missing.html)
- [Ruby Metaprogramming - Method Missing](https://www.leighhalliday.com/ruby-metaprogramming-method-missing)
