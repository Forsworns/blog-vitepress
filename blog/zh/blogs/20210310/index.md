---
title: USART, UART, RS232, USB, SPI, I2C, TTL都是啥
description: 串行通信协议总结
tags: 
- 嵌入式
---

[[toc]]

# USART, UART, RS232, USB, SPI, I2C, TTL都是啥

翻译自 StackExchange<sup>[1](#ref1)</sup>。

## Serial 

串行设备是一系列时分复用设备的统称，意味着数据是按时序传输的，通常是一个比特接着一个比特。下面提到的协议都是串行协议。

串行接口有两种基础的类型：同步和异步。

同步接口数据的传输的时机和一个明确的时钟信号有关，这个时钟信号通常也会被提供。经典的例子是SPI，但是也有其他特殊的形式比如用于音频转换的 I2S，JTAG, FPG 配置接口等。许多并行传输的方式只是将该思路拓展到一次传输多个比特。通常（但不是绝对）会先传输最高位（most significant bit，MSB）。

异步接口通常将时间时序编码到数据中，对于串口和相关的标准例如 RS232，一个字长（4 字节）的时间是在起始比特的位置进行设定，接收方以正确的时间间隔采样就足够了。其他接口有一些复杂，需要更加精巧的时钟信号恢复方法。UART（"Universal Asynchronous Receiver Transmitter），实际上是一个功能模块的称呼，它常常被用来实现字长、速率、起始终止标记可变的串口。而像 RS232, RS422这样的标准则是针对板外电子信号的传输。通常 UART 发送最低位（least significant bit，LSB)。

## UART

UART （Universal Asynchronous Receiver Transmitter） 是最常用的串行协议。它十分古老，也十分简单。大多数控制器在板子上都有一个 UART 硬件接口。它使用一条数据线路用来传输数据，另一条线路用来接收数据。通常会使用如下的方法直接传输 8-bit 的数据：1 start bit (low level), 8 data bits and 1 stop bit (high level)。低电平的开始比特和高电平的终止比特意味着，在传输开始的时候总是有一个从高到低的转换。没有给电压分级，所以你可以使用 3.3 V 或 5 V，只要你的微处理器是工作在这个电压上就行。注意想要通过 UART 通讯的微处理器必须对传输速率、比特率达成一致，因为他们只有在起始位下落处是可以实现同步的，这也是为什么该协议会被叫做异步的。

对长距离通讯来说，5 V UART 并不可靠，因此它常常被转换到更高的电压，一般是+12 V 代表"0"、-12 V 代表 "1"。数据格式仍然相同。这实际上就是 RS-232，(也可以称为 EIA-232，虽然没人这么说)。

UART 的一个很大的弊端在于依赖于时间，解决方案就是 USART （Universal Synchronous/Asynchronous Receiver Transmitter）。这种协议可以实现 UART 和同步的协议。在同步模式下，在同步情况下，不仅有数据传输，还会传输一个时钟信号。对每一位，时钟脉冲会告诉接收者它是否应该锁定那一位。同步协议或者需要更高的带宽，例如 Manchester 编码或者需要另一根时钟信号线，例如 SPI 和I2C。

## SPI

SPI (Serial Peripheral Interface) 是另一种非常简单的串行协议。master 发送一个时钟信号，在每个时钟脉冲它发送一比特给 slave，并读入来自 slave 的一比特。clock 信号名字是 SCK，Master 输出 Slave 输入是 MOSI ，Master 输入 Slave 输出是 MISO。通过使用 SS (Slave Select) 信号，master 能够同时控制总线上的多个 slave。 有两种方法来连接多个 slave 设备，一种是上面提到的使用 SS 信号，另一种是菊花链，第二种方法使用更少的引脚但是软件上更复杂。

## I2C

I2C (Inter-Integrated Circuit， 发音是 "I squared C") 也是一个同步协议，，它在设计上更加巧妙。仅有两条线，一条是用来传输时钟信号 (SCL) 另一条是传输数据 (SDA)。这就意味着 master 和 slave 能够在创建时钟信号的 master 的控制下，同时在一条线上传输数据。I2C 不用 SS 信号来选择特定的 slave 设备，但是它有地址。master 发送的第一个字节有一个7位的地址，所以在总线上能用 127 个设备，剩余1位是读写标志，指示下一字节是来自 master 的还是来自 slave 的。在每个字节之后，接收方必须发送一个 "0" 来表示它接收到了该字节，master 会在第九个时钟脉冲用锁存器（latch）锁定它。

如果 master 想要写一个字节，下面的过程会重复：master 把一个比特放在总线上的比特后面，然后每次都使用一个时钟脉冲来标记数据可以被读取了。如果 master 想要接收数据，它只需要产生时钟脉冲就可以了。slave 将会负责准备下一个时钟脉冲时的比特。这个协议的专利权在 NXP。为了减少开销，Atmel 使用了 另一个协议TWI (2-wire interface)，它和 I2C很相似，所以 AVR device 不使用 I2C 而是使用 TWI。

在同一条线上，两个或更多的信号可能会导致冲突，特别是一个设备发送 1，另一个发送 0 的时候。因此总线是 wired-OR 的：当两个电阻器都把总线拉升到高电平，设备智慧发送低电平，如果他们想要发送高电平，只能放弃掉总线。

## TTL

TTL (Transistor Transistor Logic) 它并不是一个协议。它是数字逻辑中一种更古老的技术，但是这个名字通常被用来指代 5 V 的供电电压。有人会把它和 UART 混淆。



## Reference

1. [StackExchange](https://electronics.stackexchange.com/questions/37814/usart-uart-rs232-usb-spi-i2c-ttl-etc-what-are-all-of-these-and-how-do-th) <div id="ref1"/>



