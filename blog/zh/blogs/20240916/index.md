---
title: TensorRT-LLM 源码阅读
description: 再看看 cuda graph 咋开启的 ...
tags: 
- LLM
- AI
- GPU
- CUDA
---

[[toc]]

基于 TensorRT-LLM-0.10.0，https://github.com/NVIDIA/TensorRT-LLM/releases/tag/v0.10.0
最开始想看下 cuda graph 怎么开启的。
trtllm-build 工具不像 trtexec，有 trtexec --useCudaGraph 这个选项

# cpp/tensorrt_llm/runtime/gptSession.cpp

cpp runtime 中关于 cuda graph API，是 `GptSession::mCudaGraphMode` 这个变量控制的，它被设置成了外部的 `tr::GptSession::Config::cudaGraphMode` 的配置值。


# cpp/tensorrt_llm/pybind/bindings.cpp

python binding 文件，可以看到例如 cpp 中的 `tr::GptSession::Config` 被映射成了 python 中的 `GptSessionConfig`。
它的成员被映射成了  `GptSessionConfig::cuda_graph_mode`。

# tensorrt_llm/runtime/model_runner_cpp.py

包装了 cpp 目录下的具体实现，暴露成 python 接口。从 `ModelRunnerCppGptSession::from_dir()` 的实现里面实际上可以看到 `GptSessionConfig` 这些配置项都是怎么传递进去的。实际上没有传递 cuda graph 那个参数。

# tensorrt_llm/runtime/generation.py

python runtime 中，同样是在 decode 阶段使用 cuda graph 加速。

在调用 `tensorrt_llm.runtime.GenerationSession()` 的时候，配置一下 `cuda_graph_mode=True` 即可。也就是改一下例如 `/examples/llama/summarize_long.py` 这样的示例代码。
tensorrt-llm 自己的 benchmark 里面倒是加了对应的开关，只不过是示例代码里面省略了。
