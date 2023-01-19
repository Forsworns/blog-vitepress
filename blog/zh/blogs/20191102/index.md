---
title: Lyapunov函数在探讨队列稳定性时的应用
description: 虚拟队列方法及利用Lyapunov函数证明队列稳定性
tags: 
- 算法
---

# Lyapunov在探讨队列稳定性时的应用

[[toc]]

## 虚拟队列

最近读到虚拟队列（virtual queue）技术，可以用在涉及公平性问题的模型中（如各种涉及调度、分配的问题）。通过创建一组虚拟队列，分配给每个实体$i$一个队列$q_i$来处理公平限制条件。如果用$L_i(t)$来表示队列$q_i$在$t$时刻的长度，也可以反映出调度/分配算法对实体$i$的负债（debt）。这里的思想很朴素：如果一直未对实体$i$进行调度/分配，那么相当于是亏欠了该实体，应该在之后调度/分配时给予关照:yum:。​

他的数学形式是
$Q_i(t) = [Q_i(t - 1) + a_i(t-1) - b_i(t - 1)]+$，
其中  $[x]^+ = \max\{x,0\}$，$a_i$是确保公平的条件，是某个实体至少需要选择的比例（在0到1之间），$b_i$是是否选择了该实体（选择为1，未选择为0）。从队列的角度看，a_i是到达队列中的项，等待被服务，$b_i$是被服务，离开队列的项。 一般在初始时刻设置队列为空，即$Q_i(0) = 0$。如果每轮未选择某个实体，负债会累加。如果算法在每次分配时只是选择队列最长的（负债最高的），那么高负债的就会被优先处理。

当队列长度稳定时候，虚拟队列稳定，公平调度/分配的目的达到了。


## 稳定性

何为稳定性？

:::tip
设系统初于某一个起始的平衡状态，在外作用下它离开了平衡状态，当外作用消失，弱经过较长的时间它能恢复到原来的平衡状态，则称系统是稳定的，或称系统具有稳定性。否则是不稳定的。
:::

Lyapunov对稳定性做出了严格的数学定义（Lyapunov总共定义了四种）：

点集$S(\epsilon)$表示以$X_e$为中心，$\epsilon$为半径的超球体，若$X\in S(\epsilon)$，则$\|X-X_e\|\le \epsilon$，当$\epsilon$很小，则称S(\epsilon)为$X_e$的邻域（也就是在空间内，稳定状态X_e附近的球形空间内的状态）。

系统的齐次状态方程是$\dot{X} = f(X,t)$（\dot{X}是对$X$求导），$f$是与$X$同纬的向量函数，一般为时变的非线性函数，若不显含$t$，则为定常非线性系统（就是说不含有时间项$t$的是常微分方程）。假设方程在初始条件$(t_0,X_0)$下，有唯一解$X=\Phi(t;X_0,t_0)$。

首先是Lyapunov意义下的稳定：

对系统$\dot{X} = f(X,t)$的某一平衡状态X_e，对任意选定的实数$\epsilon>0$，都对应存在实数$\delta(\epsilon,t_0)>0$，使当$\|X-X_e\|\le \delta(\epsilon,t_0)>0$时，从任意初态X_0出发的解都满足$\|\Phi(t;X_0,t_0)-X_e\|<\epsilon$，$\forall t>t_0$，则称平衡状态X_e是Lyapunov意义下稳定的（就是说初始状态不偏离平衡位置很远的时候，之后都不会过于偏离平衡位置）。其中实数$\delta$与$\epsilon$有关，一般也与$t_0$有关。

其次是渐进稳定：

当$t$无限增长时，轨迹$X(t)=\Phi(t;X_0,t_0)$不仅不超出$S(\epsilon)$，而且最终收敛于$X_e$，则称这种平衡状态$X_e$是渐进稳定的，即$\lim\limits_{t\to \infty}\|\Phi(t;X_0,t_0)-X_e\|=0$。

我们在分析队列长度时，只需要保证渐进稳定就可以了，没必要约束到每时每刻（Lyapunov意义下的稳定）。

除此之外，他还提出了Lyapunov第一法和Lyapunov第二法，第一法通过求解系统微分方程，根据解的性质分析稳定性；第二法构造标量Lyapunov函数，研究它的正定性直接判系统的稳定性。一般提到的Lyapunov方法是Lyapunov第二法。


## Lyapunov趋势定理

随机排队网络模型（queueing network）的稳定性或是最优控制常使用的工具是Lyapunov 趋势（drift）。

沿用之前的队列长度记号$Q(t)=\left(Q_{1}(t), Q_{2}(t), \ldots, Q_{N}(t)\right)$，定义一个平方Lyapunov函数（Quadratic Lyapunov functions）L，用来表示当前积压的工作（backlogs），也即之前提到的负债（debt）：

$L(t)=\frac{1}{2} \sum_{i=1}^{N} Q_{i}(t)^{2}$

函数L的输出显然是一个标量，定义Lyapunov趋势为：

$\Delta(t)=L(t+1)-L(t)$

假设队列长度按之前描述的方式增长（$Q_i(t+1) = [Q_i(t) + a_i(t) - b_i(t)]+$），那么显然有

$Q_{i}(t+1)^{2}=\max \left[Q_{i}(t)+a_{i}(t)-b_{i}(t), 0\right]^{2} \leq\left(Q_{i}(t)+a_{i}(t)-b_{i}(t)\right)^{2}$

经过移项得

$\Delta(t) \leq B(t)+\sum_{i=1}^{N} Q_{i}(t)\left(a_{i}(t)-b_{i}(t)\right)$，

其中$B(t)$是

$B(t)=\frac{1}{2} \sum_{i=1}^{N}\left[a_{i}(t)^{2}+b_{i}(t)^{2}-2 a_{i}(t) b_{i}(t)\right]$

显然$B(t)$有界

$E[B(t) | Q(t)] \leq B$

于是对Lyapunov 趋势取期望，为

$E[\Delta(t) | Q(t)] \leq B+\sum_{i=1}^{N} Q_{i}(t) E\left[a_{i}(t)-b_{i}(t) | Q(t)\right]$

:::tip
**Lyapunov 趋势定理**：如果对$a_i(t)$，$b_i(t)$ ，$\exists \epsilon$
$E\left[a_{i}(t)-b_{i}(t) | Q(t)\right] \leq-\epsilon$， $\forall i,t$，也即如果$E[\Delta(t) | Q(t)] \leq B-\epsilon \sum_{i=1}^{N} Q_{i}(t)$，
那么

$\frac{1}{t} \sum_{\tau=0}^{t-1} \sum_{i=1}^{N} E\left[Q_{i}(\tau)\right] \leq \frac{B}{\epsilon}+\frac{E[L(0)]}{\epsilon t}$， $\forall t>0$

队列稳定
:::


Lyapunov趋势定理的证明：在
$E[\Delta(t) | Q(t)] \leq B-\epsilon \sum_{i=1}^{N} Q_{i}(t)$两侧取期望，得到

$E[\Delta(t)] \leq B-\epsilon \sum_{i=1}^{N} E\left[Q_{i}(t)\right]$，对$\tau \in\{0,1, \ldots, t-1\}$累加求和该式子，得到

$E[L(t)]-E[L(0)] \leq B t-\epsilon \sum_{\tau=0}^{t-1} \sum_{i=1}^{N} E\left[Q_{i}(\tau)\right]$

注意到$E[L(t)]$非负，移项后可证。

## Lyapunov优化
同样考虑之前提到的随机排队网络模型，定义$p(t)$为t时刻的网络惩罚项（network penalty）。假设目标是稳定队列的同时最小化p(t)对时间的均值（当需要最大化r(t)的时候，可以定义为p(t)=-r(t)）。

为了达到这个目标，算法可以被设计为最小化下面这个bound（drift-plus-penalty expression）：

$\Delta(t)+V p(t)$，这里$V$是一个非负的权重，用来做队列稳定和优化目标的tradeoff。不妨假设$p(t)$存在下界$p_{\min}$，即$p(t) \geq p_{\min } \forall t \in\{0,1,2, \ldots\}$。

:::tip
**Lyapunov Optimization定理**：
如果$B \geq 0, \epsilon>0, V \geq 0, p^{*}$，$\forall t$，也即$E[\Delta(t)+V p(t) | Q(t)] \leq B+V p^{*}-\epsilon \sum_{i=1}^{N} Q_{i}(t)$

那么$\forall t>0$

$\frac{1}{t} \sum_{\tau=0}^{t-1} E[p(\tau)] \leq p^{*}+\frac{B}{V}+\frac{E[L(0)]}{V t}$

$\frac{1}{t} \sum_{\tau=0}^{t-1} \sum_{i=1}^{N} E\left[Q_{i}(\tau)\right] \leq \frac{B+V\left(p^{*}-p_{\text {min}}\right)}{\epsilon}+\frac{E[L(0)]}{\epsilon t}$
:::

证明方法与上面的类似，对条件取期望后，对不同$t$时刻的式子累加得证。



## References
虚拟队列：Stochastic network optimization with application to communication and queueing systems

队列稳定性：Combinatorial Sleeping Bandits with Fairness Constraints

Lyapunov优化：http://en.wikipedia.org/wiki/Lyapunov_optimization

