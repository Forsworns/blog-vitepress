---
title: 移动通信和SIM卡
description: 移动通信和SIM相关内容简记
tags: 
- 通信
---

# 移动通信和SIM卡

[[toc]]

### 移动通信的多址接入技术

移动通信(cellular network)中的多址接入技术有FDMA、TDMA、CDMA、SDMA、OFDM、NOMA。

第一代移动通信系统（1G）主要采用频分多址接入方式（FDMA），第二代移动通信系统（2G）主要采用时分多址接入方式（TDMA），第三代移动通信系统（3G）主要采用码分多址接入方式（CDMA），第四代通信系统（4G）主要采用正交频分复用多址接入方式（OFDM）。

#### FDMA（频分复用）

频分多址（Frequency Division Multiple Access，FDMA），是把总带宽被分隔成多个正交的信道，每个用户占用一个信道。例如，把分配给无线蜂窝电话通信的频段分为30个信道，每一个信道都能够传输语音通话、数字服务和数字数据。频分多址是模拟高级移动电话服务(AMPS)中的一种基本的技术，北美地区应用最广泛的蜂窝电话系统。采用频分多址，每一个信道每一次只能分配给一个用户。频分多址还用于全接入通信系统(TACS)。

#### TDMA（时分多址）

时分多址（Time division multiple access，TDMA） 是一种为实现共享传输介质（一般是无线电领域）或者网络的通信技术。它允许多个用户在不同的时间片（时隙）来使用相同的频率。用户迅速的传输，一个接一个，每个用户使用他们自己的时间片。这允许多用户共享同样的传输媒体（例如：无线电频率）。

#### CDMA（码分多址）

码分多址（Code Division Multiple Access，CDMA）是指利用码序列相关性实现的多址通信。码分多址的基本思想是靠不同的地址码来区分地址。每个地址配有不同的地址码，用户所发射的载波(为同一载波)既受基带数字信号调制，又受地址码调制，接收时，只有确知其配给地址码的接收机，才能解调出相应的基带信号，而其他接收机因地址码不同，无法解调出信号。划分是根据码型结构不同来实现和识别的，一般选择伪随机码(PN码)作地址码。由于PN码的码元宽度远小于PCM信号码元宽度(通常为整数倍)，这就使得加了伪随机码的信号频谱远大于原基带信号的频谱，因此，码分多址也称为扩频多址。

#### SDMA（空分复用接入）

SDMA（Space Division Multiple Access，空分复用接入）是一种卫星通信模式，它利用碟形天线的方向性来优化无线频域的使用并减少系统成本。这种技术是利用空间分割构成不同的信道。

#### OFDM（正交频分复用）

正交频分复用（Orthogonal Frequency Division Multiplex，OFDM）。正交频分复用是在频分复用的基础上进一步压缩频带，提高频谱利用率。如下图所示，用户之间的频带有所交叠，但是每个用户频带功率最大的那个点其他的信号能量都为0，所以在每个用户频带功率最大值点处，各个用户信号依旧是正交的。

#### NOMA （非正交多址）

NOMA跟以往的多址接入技术不同，NOMA采用非正交的功率域来区分用户。所谓非正交就是说用户之间的数据可以在同一个时隙，同一个频点上传输，而仅仅依靠功率的不同来区分用户。在发送端采用非正交发送，主动引入干扰信息，在接收端通过串行干扰删除技术实现正确解调。与正交传输相比，接收机复杂度有所提升，但可以获得更高的频谱效率。

- 串行干扰消除（SIC）：引入干扰信息可以获得更高的频谱效率，但是同样也会遇到多址干扰(MAI)的问题。关于消除多址干扰的问题。NOMA在接收端采用SIC接收机来实现多用户检测。串行干扰消除技术的基本思想是采用逐级消除干扰策略，在接收信号中对用户逐个进行判决，进行幅度恢复后，将该用户信号产生的多址干扰从接收信号中减去，并对剩下的用户再次进行判决，如此循环操作，直至消除所有的多址干扰。
- 功率复用：SIC在接收端消除多址干扰(MAI)，需要在接收信号中对用户进行判决来排出消除干扰的用户的先后顺序，而判决的依据就是用户信号功率大小。基站在发送端会对不同的用户分配不同的信号功率，来获取系统最大的性能增益，同时达到区分用户的目的，这就是功率复用技术。

### 技术演进

#### 2G

2G包含GSM。全球移动通信系统(Global System for Mobile Communications) ，缩写为GSM，由欧洲电信标准组织ETSI制订的一个数字移动通信标准。它的空中接口采用时分多址技术 。自90年代中期投入商用以来，被全球超过100个国家采用。GSM标准的无处不在使得在移动电话运营商之间签署"漫游协定"后用户的国际漫游变得很平常。 GSM 较之它以前的标准最大的不同是它的信令和语音信道都是数字式的，因此GSM被看作是第二代 (2G)移动电话系统。

#### 3G

3G包含UMTS和LTE。第三代 (3G)移动电话系统因为主要运用了CDMA技术，故3G三大标准命名为美国CDMA2000，欧洲WCDMA，中国TD-SCDMA。

#### 4G

4G包含WiMax和LTE。LTE是long Term Evolution（长期演进）的缩写。3GPP标准化组织最初制定LTE标准时，定位为3G技术的演进升级。后来，LTE技术的发展远远超出了预期，LTE的后续演进版本Release10/11(即LTE-A)被确定为4G标准。LTE根据双工方式不同，分为LTE-TDD和LTE-FDD两种制式，其中LTE-TDD又称为TD- LTE。

#### 5G

包含三大应用场景：
- eMBB：增强型移动宽带（人类通信）
- mMTC：海量机器类通信（物联网）
- URLLC：超可靠、低时延通信（无人驾驶、工业自动化）
五大创新：
- mmWave：使用目前波段较小的mmWave（毫米波），频率高，便于提高频谱带宽，传输速度快（由香农第二定理）。
- Massive MIMO：Multiple-Input Multiple-Output。基站的天线变多了，并且手机的接受能力也变强了，源头上多根天线发送，接收对象多根天线接受。为了进一步提升5G网络的覆盖面积，5G网络将原有的宏基站改为了微基站。
- Beam Management意为波束赋形，它主要是改变了信号的发射形式进行的改变。基于天线阵列的信号预处理技术，通过调整天线阵列中的每个阵元的加权系数产生具有指向性的波束。
- LDPC/Polar：Polar Code（极化码）为控制信道的编码方案，LDPC码作为数据信道的编码方案。
- AS Layer：一种新型的架构模式，主要是以正交频分多任务（OFDM）为基础的弹性参数物理层，它可以最多包含5个次载波。该架构可以同时回应更快速的数据与响应速度。

:::tip
香农第二定理：

在噪声与信号独立的高斯白噪信道中，假设信号的功率为S，噪声功率为N，信道通频带宽为W(Hz)，则该信道的信道容量C为

$C=W \log _{2}\left(1+\frac{S}{N}\right)$

单位是bps。这里信道容量是一定信噪比和传输带宽下，信道的传输速率上限。
:::

#### 3GPP
3GPP最初的工作范围是为第三代移动通信系统制定全球适用的技术规范和技术报告，之后致力于移动通信的标准化。3GPP制定的标准规范以Release作为版本进行管理。

### SIM卡

SIM（Subscriber Identity Model，客户识别模块）卡为大规模集成电路卡片。卡片内部存了数字移动电话客户的信息、加密密钥等内容，可对客户身份进行鉴别，并对客户通话时的语音信息进行加密。SIM卡的使用，防止通话被窃听。SIM卡的制作是严格按照GSM国际标准和规范来完成的，它使客户的正常通信得到了可靠的保障。一张SIM卡唯一标识一个客户。一张SIM卡可以插入任何一部手机中使用，而使用手机所产生的通信费用则自动记录在该SIM卡所唯一标识的客户的帐户上。

硬件结构上SIM卡是一个装有微处理器（CPU）的芯片卡，它的内部有5个模块，并且每个模块都对应一个功能：微处理器CPU、程序存储器ROM（3～8kbit）、工作存储器RAM（6～16kbit）数据存储器EEPROM（16～256kbit）和串行通信单元。这5个模块被胶封在SIM卡铜制接口后与普通IC卡封装方式相同。这5个模块必须集成在一块集成电路中，否则其安全性会受到威胁，因为芯片间的连线可能成为非法存取和盗用SIM卡的重要线索。

SIM卡的背面有以五个一排，被排成四排的一组数字，在这组数字最前面的六位数字所代表的是中国的代号。第七位数字则代表的是接入号码。第八位数字代表的是该SIM卡的功能位。第九和第十位数字代表了该SIM卡所处的省份。至于第十一和第十二位数字则代表的是该SIM卡的年号，而第十三位数字则是SIM卡供应商的代码。从第十四位开始至第十九位数字则代表了该SIM卡的用户识别码。最后一个数字是校验位。

#### SIM卡存储的数据

- 由SIM卡生产厂商存入的系统原始数据

- 存储手机的固定信息，手机在出售之前都会被SIM卡中心记录到SIM卡当中，主要包括鉴权和加密信息、国际移动用户识别码（IMSI）、IMSI认证算法、加密密匙生成算法、密匙生成前的用户密匙的生成算法（这三种算法均为128位）

- 用户自己存入的数据，如短消息、固定拨号、缩位拨号、性能参数、话费记数等；能够存储有关的电话号码，也就是具备电话簿功能。

- 有关于网络方面的数据，用户在用卡过程中自动存入和更新的网络接续和用户信息类数据，包括最近一次位置登记时手机所在位置识别号、设置的周期性位置更新间隔时间、临时移动用户号等。不过这种数据的存放是暂时性的，也就是说它并不是永久的存放于SIM卡之中。

- 相关的业务代码，这一点相信也是大家很熟悉的，那就是非常重要的个人识别码(PIN码)，还有就是解开锁定用的解锁码(PUK)等等。

#### IMEI、IMSI、KI、ICCID

- 国际移动用户识别码（IMSI：International Mobile Subscriber Identification Number）是区别移动用户的标志，储存在SIM卡中，可用于区别移动用户的有效信息。IMSI总长度不超过15位，同样使用0～9的数字。其中MCC是移动用户所属国家代号，占3位数字，中国的MCC规定为460；MNC是移动网号码，最多由两位数字组成，用于识别移动用户所归属的移动通信网；MSIN是移动用户识别码，用以识别某一移动通信网中的移动用户。
- KI （Key Identifier）是SIM卡与运营商之间加密数据传递的密钥。当系统进行验证时会同时使用KI及IMSI，经过一连串系统安全认证讯息后产生随机变量，进行加密计算后验证身份入网。
- 国际移动设备识别码（IMEI：International Mobile Equipment Identification Number）是区别移动设备的标志，储存在移动设备中，可用于监控被窃或无效的移动设备。移动终端设备通过键入“*#06#” 即可查得。其总长为15位，每位数字仅使用0～9的数字。其中TAC代表型号装配码，由欧洲型号标准中心分配；FAC代表装配厂家号码；SNR为产品序号，用于区别同一个TAC和FAC中的每台移动设备；SP是备用编码。
- ICCID：Integrate circuit card identity 集成电路卡识别码即SIM卡卡号，相当于手机号码的身份证。 ICCID为IC卡的唯一识别号码，共有20位数字组成。

由此看来，只要知道SIM卡的KI、IMSI值，我们就可以通过软件仿真出SIM卡的功能，甚至可以利用多组KI、IMSI值，用一张微处理器卡片来同时仿真本来需要多张SIM所完成的功能，这就是“一卡多号”技术。

### 小米eSIM文档简记

[原文档传送门](http://doc.miot.10046.mi.com/esim/eSIM.html)

具体细节应该阅读GSMA SGP协议。

eSIM指嵌入式SIM卡(Embedded SIM)，支持通过空中远程配置SIM卡数据，最初应用在物联网领域，近年逐渐发展到消费电子领域。主要特点有：

1、物理尺寸小，可直接封装在通信模块上，节省硬件空间，适应恶劣的工作环境，使用寿命长，可有效的保证移动通信的稳定性和设备的安全性。

2、可以动态远程下载SIM卡数据，方便用户主动触发下载/管理卡数据，或者动态更换卡数据，灵活选择签约运营商。

GSMA制定了两套eSIM标准，一套面向M2M市场，一套面向公众消费市场。在M2M领域，eSIM封装一般采用不可插拔形态，而在消费电子领域，eSIM封装既可以采用不可插拔形态， 也可以采用可插拔形态。M2M领域的设备主要包括公用仪表、监控摄像头和车载设备等，M2M设备根据需要可能放置于偏远或高温高湿等较恶劣的环境中；消费电子设备通常包括手机、平板电脑和可穿戴设备等。由于M2M设备所处的环境限制且M2M业务通常由平台侧发起，M2M eUICC中必须包含预置号码使得平台能够与eUICC建立初始连接；而消费电子设备比较灵活，可以通过Wifi、蓝牙等方式建立通信连接，因此不是必须包含预置号码。

eSIM发行后，为了实现对卡片上的文件和参数集进行配置管理，需要设计一套eSIM卡远程配置(Remote SIM Provisioning，RSP)管理系统。

#### M2M

- eUICC：嵌入式UICC；

- SM-SR：签约管理安全路由服务器，主要功能是实现eUICC远程配置数据的安全路由和传输； 

- SM-DP ：签约管理数据准备服务器，主要功能是eUICC卡数据的生成和管理，需要与其他的运营商后台系统以及制卡中心进行交互，获取并生成相应的卡数据。

- MNO：运营商(小米移动物联网平台)，主要负责eUICC卡片信息的维护与管理，并提供开户、注销、码号迁移等功能。

- EUM：eUICC生产商；

- CI：证书发行。

eUICC远程管理平台是eUICC远程管理的核心，主要功能是实现eUICC远程下载个人数据，并且通过提供授权认证、防攻击、隐私保护和完整性保护等措施保证下载过程的安全性。eUICC远程管理平台根据功能可以划分为数据准备SM-DP和数据安全路由SM-SR两部分。在数据准备阶段，SM-DP接收来自MNO的数据参数生成个人数据并进行加密。在数据传输过程中，SM-SR建立到eUICC的安全通道，将个人数据和消息通过安全路由下载到目标eUICC中，并负责将eUICC发送的消息路由到管理平台。同时，SM-SR也负责管理已经下载到eUICC中的个人数据，如激活、去激活、删除等。

#### 消费电子设备

相比M2M的eSIM架构，SM-SR的功能由SM-DP+以及LPA取代（某些部署模式下仍存在SM-SR），并且新增加了本地Profile代理（LPA，Local Profile Agent）以及发现服务器（SM-DS）。

LPA是新架构中的关键组成，它实现了三部分功能：

- 本地发现（Local Discovery Service），从发现服务器（SM-DS）获取能够给eUICC提供Profile Package的目标SM-DP+的地址；

- Profile下载（Local Profile Download），作为eUICC与SM-DP+之间的代理，从SM-DP+获取Profile数据包，再转移到eUICC中；

- 本地用户接口（Local User Interface），面向用户提供Profile管理的接口和功能，包括Profile的激活、去激活、删除等。

SM-DS负责为终端设备提供目标SM-DP+的地址，使得终端设备可以找到该SM-DP+并下载所需的Profile Package，其功能包括：

1. eUICC ID注册：，当为目标eUICC准备的Profile Package就绪后，SM-DP+向SM-DS注册该eUICC ID；
2. SM-DP地址提供：目标终端设备的LPA访问SM-DS，SM-DS向其提供SM-DP+的URL地址。

激活码(Activation Code)：激活码用于启动到指定SM-DP+的Profile下载流程，包括SM-DP+地址、激活码令牌、SMDPid等信息，它能够唯一标识运营商/业务提供商，可以支持二维码扫描、人工输入等方式输入激活码。

一个常见的基于以上eUICC远程业务配置融合方案的业务操作过程由以下几个步骤组成：

1. 运营商与用户达成业务订购协议，向SM-DP+发起创建Profile Package的指令。

2. SM-DP+创建Profile Package，其中包括与可插拔SIM卡一样的IMSI、Ki、AKA等密钥及数据，并且对该Profile Package进行加密。

3. SM-DP+向SM-DS发起eUICC ID注册，告知SM-DS为目标eUICC准备的Profile Package已经就绪。

4. 终端设备发起SM-DS查询获取SM-DP+的地址，此外，还可以由运营商在定制终端内预置SM-DP+信息、用户扫描二维码等途径获取SM-DP+地址。之后消费电子设备可通过LPA接入到SM-DP+并下载经定制的Profile Package。

5. LPA把Profile Package转发给eUICC，由eUICC对Profile Package进行解密并安装Profile。

6. 用户通过LPA操作eUICC上存储的Profile，如：激活、切换、删除等。

#### 案例

基于TEE/eSE的eSIM方案，在小米手机上已经成功商用，小米漫游业务就是基于该方案的产品。小米漫游面向出境用户，提供海外数据流量服务。用户在手机上购买目的地区的流量套餐后，利用上述技术，会自动下载一个当地的SIM卡的profile到手机的TEE/eSE中，用户到达目的地后，就可以直接启动该流量套餐。（这里小米只会提供一个运营商的账号，持续使用？）

:::tip

eSE

基于硬件芯片的模块，安全级别可以做到最高。

eSE(嵌入式安全芯片)是一种防篡改的芯片，其大小不一，设计也可不同，并可嵌入在任意一种移动设备中。基于硬件芯片的模块，安全级别可以做到最高，如果是在eSE里实现的eSIM功能，其功能不仅仅是目前运营商业务，意味着eSE的适用范围较广，可保证任意一种设备以及各种用例(例如支付、票券兑换、交通、访问控制、票务、公司、云计算、电子政务等)中应用程序的安全。

:::



:::tip

REE（Rich Execution Environment）

所有移动设备都支持REE，用于运行通用OS：Android、iOS、Linux，为上层App提供设备的所有功能，是开放的、可扩展的且通用的。但是基于OS实现的App隔离极易被绕过；OS代码庞大，漏洞频发；OS很难被检验和认证；OS可以看到App内部的所有数据；缺乏隔离意味着App无法安全存储密钥。

:::



:::tip

TEE（Trusted Execution Environment）可信执行环境

受硬件机制保护，TEE隔离于REE、只能通过特定的入口与TEE通信、并不规定某一种硬件实现方法；TEE运行时使用CPU的全部性能（独占），具有高性能；TEE可以访问REE的内存、REE无法访问受硬件保护的TEE内存，通信快速；TEE中可以同时运行多个Trusted Application（TA）。

由GlobalPlatform（GP）标准化，TEE中的可执行代码在执行前先要被验证（validate）。

:::

### 安卓eSIM文档简记

[原文档传送门](https://source.android.google.cn/devices/tech/connect/esim-overview)

嵌入式 SIM（又称 eSIM 或 eUICC）是一种最新技术，可让移动用户在没有实体 SIM 卡的情况下，下载运营商配置文件并激活运营商服务。该技术是由 GSMA 推动的全球规范，支持在任何移动设备上进行远程 SIM 配置。从 Android 9 开始，Android 框架提供了用于访问 eSIM 和管理 eSIM 上的订阅配置文件的标准 API。借助这些 eUICC API，第三方可以在支持 eSIM 的 Android 设备上开发自己的运营商应用和 Local Profile Assistant (LPA)。

LPA 是一款独立的系统应用，应包含在 Android 编译映像中。对 eSIM 上配置文件的管理通常由 LPA 完成，因为它充当着 SM-DP+（用来准备、存储配置文件包并将其交付给设备的远程服务）和 eUICC 芯片之间的桥梁。LPA APK 可以选择性地包含一个界面组件（又称 LPA 界面或 LUI），以便为最终用户提供一个中心位置来管理所有嵌入式订阅配置文件。Android 框架可自动发现可用性最高的 LPA 并与之连接，然后通过 LPA 实例路由所有 eUICC 操作。

有兴趣开发运营商应用的移动网络运营商可以参阅 [EuiccManager](https://developer.android.google.cn/reference/android/telephony/euicc/EuiccManager) 中的 API，其中介绍了高级配置文件管理操作（例如 `downloadSubscription()`、`switchToSubscription()` 和 `deleteSubscription()`）。

如果您是有兴趣自行开发 LPA 系统应用的原始设备制造商 (OEM)，那么您必须为 Android 框架扩展 [EuiccService](https://android.googlesource.com/platform/frameworks/base/+/master/core/java/android/service/euicc/EuiccService.java) 以连接到您的 LPA 服务。此外，您还应使用 [EuiccCardManager](https://android.googlesource.com/platform/frameworks/base/+/master/telephony/java/android/telephony/euicc/EuiccCardManager.java) 中的 API，这些 API 提供了基于 GSMA 远程 SIM 配置 (RSP) v2.0 的 ES10x 函数。此类函数用于向 eUICC 芯片发出命令（例如 `prepareDownload()`、`loadBoundProfilePackage()`、`retrieveNotificationList()` 和 `resetMemory()`）。

[EuiccManager](https://developer.android.google.cn/reference/android/telephony/euicc/EuiccManager) 中的 API 需要一个正确实现的 LPA 应用才能正常运行，且 [EuiccCardManager](https://android.googlesource.com/platform/frameworks/base/+/master/telephony/java/android/telephony/euicc/EuiccCardManager.java) API 的调用程序必须是 LPA。这是 Android 框架的强制要求。

搭载 Android 10 或更高版本的设备可以支持具有多个 eSIM 卡的设备。



### SIM卡写号方式

- 通过USIM应用程序复制粘贴。

- APP通过OMAPI接口写入。安卓可以使用OMAPI（Open Mobile API）。
- OTA（Over the Air Technology）短信写号。该方法需要卡上原先有一个种子号用来接收短信。
- BIP。BIP需要一个种子号，使用种子号的数据流量和服务器通信。
- STK。IOS只能通过STK私有的API接口写号。

有些特殊的卡比如蓝牙卡和SWP卡，有特殊接口手机传输指令到SIM卡。

运营商的空白卡在里面集成了iccid、ki和opc，没有imsi。营业厅写号写的是imsi。

### STK（SIM Tool Kit）

STK/UTK 是Sim卡工具包，其中定制了与运营商相关的应用。SIM卡是插在Modem中的，要读取SIM卡的内容，就必须要经过Modem层，而与Modem层进行交互离不开AT指令。安卓的RIL层（Radio Interface Layer）可以发送AT指令。运营商读取SIM卡流程可以归结为：STK应用---->RILJ---->RILC---->Modem---->运营商的基站。

### IOS Core Telephony API

- CTCarrier定义了Carrier（真实的运营商）的类。类的方法提供了接口去获取运营商的名字，卡上的IMSI中的MCC，运营商国家编码。

- CTTelephonyNetworkInfo类提供了移动服务提供商的信息。
- CTSubscriber是订阅移动网络变化事件的类，可用CTSubscriberInfo实例化后获取，与CTSubscriberDelegate相配合。
- CTCellularData用来确定app能否获取移动数据。
- CTCellularPlanProvisioningRequest用来创建一个向eSIM服务器发送请求的对象，服务器需要符合上面的SMDP+标准。使用之前的api创建对象后，使用CTCellularPlanProvisioning类的实例来下载和安装eSIM。使用CTCellularPlanProvisioning类实例的addPlan()方法后，IOS会引导用户进行eSIM切换和设置。用户授权后可以后台进行eSIM的安装，使用beginBackgroundTask(expirationHandler:) 让addPlan可以在后台切换。

### 微软对eSIM的支持

在 Intune 中，可以导入移动运营商提供的一次性使用的激活码。 要在 eSIM 模块上配置手机网络流量套餐，请将这些激活码部署到支持 eSIM 的设备。 当 Intune 安装激活码时，eSIM 硬件模块会使用激活码中的数据联系移动运营商。 完成后，eSIM 配置文件将下载到设备上，并配置为激活手机网络。
要使用 Intune 将 eSIM 部署到设备，需要以下条件：

- 支持 eSIM 的设备，例如，Surface LTE：请参阅设备是否支持 eSIM。 或者，请参阅一些已知支持 eSIM 的设备的列表（在本文中）。
- 已注册并且由 Intune 托管 MDM 的 Windows 10 Fall Creators Update PC（1709 或更高版本）
- 移动运营商提供的激活码 。 这些一次性使用的激活码被添加到 Intune，并部署到支持 eSIM 的设备。 请联系移动运营商获取 eSIM 激活码。

CSV 文件要求
使用具有激活码的 csv 文件时，请确保你或你的移动运营商遵循以下要求：

- 该文件必须采用 csv 格式 (filename.csv)。

- 文件结构必须严格遵循格式要求。 否则，会导入失败。 Intune 在导入时检查文件，并且如果发现错误则会失败。

- 激活码为一次性使用。 建议不要导入先前导入过的激活码，因为在部署到相同或不同的设备时可能会导致问题。

- 每个文件应特定于单个移动运营商，并且所有激活码应特定于同一计费套餐。 Intune 将激活码随机分配给目标设备。 无法保证哪个设备会获得特定的激活码。

- 一个 csv 文件中最多可以导入 1000 个激活码。

csv 的第一行和第一个单元格是移动运营商 eSIM 激活服务的 URL，称为 SM-DP +（订阅管理器数据准备服务器）。 URL 应为完全限定的域名 (FQDN)，不带任何逗号。第二行和所有后续行都是包含两个值的唯一一次性使用的激活码：第一列是唯一的 ICCID（SIM 芯片的标识符）第二列是匹配的 ID，只用逗号分隔它们（末尾没有逗号）。 

eSIM 激活码为一次性使用。 Intune 在设备上安装激活码后，eSIM 模块会联系移动运营商以下载手机网络配置文件。 该联系人会完成将设备注册到移动运营商网络。

