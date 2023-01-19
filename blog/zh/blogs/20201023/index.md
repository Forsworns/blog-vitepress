---
title: WebRTC折腾笔记
description: WebRTC on WSL2 Ubuntu2 折腾笔记
tags: 
- 配环境
---


# WebRTC on WSL2 Ubuntu2 折腾笔记

[[toc]]

WebRTC的安卓开发环境只能在Linux系统上使用，因此我在Windows下的WSL2中搭建了环境，我的WSL2安装的是Ubuntu20，在搭建过程中遇到了一些坑，记录下来。部分内容参考自[博客](https://www.cnblogs.com/hejunlin/p/12526727.html)。

## Android环境搭建

首先我们需要参考[官方文档](https://webrtc.googlesource.com/src/+/refs/heads/master/docs/native-code/android/index.md)，发现需要先安装[prerequisite software](https://webrtc.googlesource.com/src/+/refs/heads/master/docs/native-code/development/prerequisite-sw/index.md)

```shell
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
export PATH=/path/to/depot_tools:$PATH # 建议写入~/.bashrc
```

接着运行

```shell
fetch --nohooks webrtc_android # 会下很久……万幸有输出会提示没断开连接
gclient --nohooks sync
gclient runhooks
```

在这一步WSL2需要配置代理，同时后面用到`download_google_storage`也可能有代理问题，所以同时最好给gclient单独配置`your_webrtc_directory/http_proxy.boto`文件设置代理规则，建议将下述命令写入`~/.bashrc`

```shell
export hostip=$(cat /etc/resolv.conf |grep -oP '(?<=nameserver\ ).*')
echo -e "[Boto]\nproxy = ${hostip}\nproxy_port = 8888" > your_webrtc_directory/http_proxy.boto
alias setss='export https_proxy="http://${hostip}:8888";export http_proxy="http://${hostip}:8888";export all_proxy="http://${hostip}:8888";'
```

之后在windows中打开SSR/V2Ray/Clash等代理工具，设置允许本地代理，选择允许来自局域网的连接，将端口设置到8888，运行`source ~/.bashrc`和`setss`，设置WSL2下的代理规则。

在运行`gclient runhook`时，Ubuntu20中因为没有安装python2.7会报相关错误，`sudo apt install python`后解决。

重新运行`gclient runhook`，接着会产生无法下载debian_sid_i386-sysroot的问题，这是DNS有问题，直接在浏览器打开[下载链接](https://commondatastorage.googleapis.com/chrome-linux-sysroot/toolchain/d967bcef40477dbc39acef141ff22bf73f3e7cdb/debian_sid_i386_sysroot.tar.xz)也下载不到。修改Windows下无线网卡的DNS为谷歌的8.8.8.8/8.8.4.4后，可以在浏览器中下载到，移动到了`your_webrtc_directory/src/build/linux/debian_sid_i386-sysroot`中，修改`your_webrtc_directory/src/build/linux/sysroot_scripts/install-sysroot.py`为

```python
tarball = os.path.join(sysroot, tarball_filename)
if not os.path.exists(tarball): # 检查是否已经有了 
    if os.path.isdir(sysroot):
        shutil.rmtree(sysroot)
		……
        response = urlopen(url) # 或者在这里设置代理为hostip:8888也行
            with open(tarball, "wb") as f:
  		……
```

重新运行`gclient runhook`，同样方法处理之后的amd64 sysroot下载不到的问题。之后可能会有clang-llvm的安装问题，通过在Windows下的代理中设置DNS为谷歌的8.8.8.8后解决。

之后的就都正常下载下来了，如果出问题，重新跑一下`setss`。

之后开始安装编译过程中必要的工具

```shell
# 在your_webrtc_directory下
cd src 
build/install-build-deps-android.sh 
gn gen out/Debug --args='target_os="android" target_cpu="arm"'
autoninja -C out/Debug # 会花费很长时间
autoninja -C out/Debug AppRTCMobile # 只编译AppRTCMobile
```

至此，编译完成了！

切换到Release m85，之后固定在这个版本

```shell
git checkout -b m85 refs/remotes/branch-heads/4183
```



# Linux环境搭建

项目结构和上面类似，但是有一些example没有，也不知道别的有没有区别……就直接重新搭建了一份

过程类似，因为depot_tools安过了，所以第一步可以跳过了

```shell
fetch --nohooks webrtc_android
gclient --nohooks sync
gclient runhooks
```

同样会遇到root image下不到的情况，类似上面可以处理掉

之后使用GN生产Ninja编译配置文件

```shell
gn gen out/Default
# gn gen out/Default --args='is_debug=false' # release version
# gn clean out/Default # clean builds
ninja -C out/Default # compile
```

切换到Release m85，之后固定在这个版本

```shell
git checkout -b m85 refs/remotes/branch-heads/4183
```

在`src`目录下查看一下文件大小

```shell
du --max-depth=1 -h

27M     ./data
17G     ./third_party
1.9M    ./p2p
968K    ./rtc_tools
9.9M    ./sdk
1.3M    ./call
4.3M    ./rtc_base
104K    ./stats
4.3M    ./pc
4.3G    ./out
502M    ./examples
325M    ./.git
164K    ./docs
2.8M    ./video
696K    ./audio
948K    ./logging
83M     ./base
188K    ./system_wrappers
92M     ./buildtools
49M     ./testing
1.9M    ./media
1.5M    ./tools_webrtc
6.7M    ./test
640M    ./build
20K     ./build_overrides
1.4G    ./resources
1.3M    ./common_audio
12K     ./style-guide
368K    ./common_video
1.1G    ./tools
2.8M    ./api
20M     ./modules
25G     .
```

过滤掉大的、没必要改动的文件夹

# Android Studio配置

官网上的方法已经标出了无法使用，推荐直接将`src/examples/androidapp/`下的代码拷贝出来。

用Android Studio创建一个项目，创建时`minSdkVersion`设置为21而不是默认的16，因为webrtc包不支持更低的版本。package name建议设置成了`org.appspot.apprtc`，在Android Studio项目目录结构中，把`src/examples/androidapp/`下的文件放到对应位置。注意 `src/examples/androidapp/third_party/autobanh/lib/autobanh.jar`文件需要拷贝到 `src/libs` 目录下，`third_party`中的其他文件可以删掉了。其他的比如`build.gradle`在`app` Module下，`res`文件夹是在`src/main`下，`org`放到`src/main/java`下。

这时需要用Android Studio的Refactor选项中的Migrate to AndroidX，升级陈旧的依赖。但是这里有个坑是Nullable注解依赖不会自动更新，所以需要将java源代码中所有的`import android.support.annotation.Nullable;`替换为`import androidx.annotation.Nullable;`。然后sync一下gradle，就可以build了。





