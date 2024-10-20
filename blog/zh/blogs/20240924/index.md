---
title: kTransformers 源码阅读
description: 可便捷调优的推理服务器
tags: 
- LLM
- AI
- GPU
- CUDA
---

[[toc]]

基于 https://github.com/kvcache-ai/ktransformers/tree/0f054fe4ff73133378a8de8ae17f47d5f3ec680a

kvcache-ai/ktransformers 是一个很有趣的推理服务器，只需要写一个 YAML 配置文件，就可以动态地注入借助 SIMD、[marlin](https://github.com/IST-DASLab/marlin) 等方法调优后的模块，替换原始模型中的结构。


清华的章明星老师有一个讲座视频：https://www.bilibili.com/video/BV1CAW6eiENy/

先从服务端入口读起来

## ktransformers/server/api/__init__.py
服务端的路由定义，支持多种风格：ollama、OpenAI、web

## ktransformers/server/api/openai/endpoints/chat.py
OpenAI 接口实现在这里,使用的是 fastapi 构建的服务器，一些用户参数的解析可以在 ktransformers/server/schemas/endpoints/chat.py 里面看到，例如 `/chat/completions` 的参数 `ChatCompletionCreate` 现在其实只支持了 steram 类型响应，也忽略了 model 参数。

## ktransformers/server/utils/create_interface.py

从上面 OpenAI 的 `/chat/completions` 实现可以继续找到后端推理服务的实现。该文件内实现了一个全局单例 GlobalInterface，server 在处理推理请求的时候都会去获取这个单例，调用 `inference` 接口执行推理，目前支持两种后端：transformers、ktransformers，都在 ktransformers/server/backend/interfaces 路径下，还有个 `exllamav2` 看上去还未实现。

ktransformers 和 transformers 后端间是存在继承关系的：`KTransformersInterface -> TransformersInterface -> BackendInterfaceBase`。他们重要的成员都是 tokenizer、model、cache。只是 `KTransformersInterface` 里面的 model 是通过 `optimize_and_load_gguf()` 函数根据 YAML 配置优化过的模型。

`TransformersInterface` 做一次推理的完整的调用链是 

```
inference()
	-> prefill()
	-> generate()
		-> decode_one_tokens()`。
```

`KTransformersInterface` 只重载了 `TransformersInterface` 的 `decode_one_tokens()` 这个方法，也就是只有 decode 阶段是优化过的，prefill 阶段是默认的。


## ktransformers/models/
这个目录下面放的都是模型的具体实现。
我们测试的 deepseek 就放在了这里，我们支持了 decode 阶段现的任意保存恢复启停，但是 prefill 阶段做保存恢复就 segmentfault 了。

## ktransformers/operators/

Ktransformer 的调优实现，即开头提到的注入到模型中的模块。


## ktransformers/util/cuda_graph_runner.py

一开始关注这个项目，就是听到前面的视频里面，章老师提到用到了他们用了 CUDA Graph，看了下这段用的是 torch.cuda 的接口，实现得很简洁清晰，刚好可以拿来做我们的测试用例。 直接去跑 Llama.cpp 我一直调用不到 CUDA Graph API = =

这里实现的话就是借助了 CUDA API 的自动捕获能力。因为图的输入输出 buffer 都是 capture 得到的，所以需要注意保证在执行 CUDA Graph 的时候还是固定地址，因此可以看到 `CUDAGraphRunner::forward` 需要把数据拷贝到之前已经创建好的固定的 buffer 里面。

```python
class CUDAGraphRunner:
def forward(
        self,
        cur_token,
        position_ids,
        cache_position,
    ) -> torch.Tensor:
        # Copy the input tensors to the input buffers.
        inputs_embeds = self.model.model.embed_tokens(cur_token.to("cpu"))
        self.input_buffers["inputs_embeds"].copy_(inputs_embeds)
        self.input_buffers["position_ids"].copy_(position_ids)
        self.input_buffers["cache_position"].copy_(cache_position)

        # Run the graph.
        self.graph.replay()
        torch.cuda.synchronize(self.main_device)
        # Return the output tensor.
        return self.output_buffers["logits"]

```

`CUDAGraphRunner` 只用在了下面两个地方。

### ktransformers/server/backend/interfaces/ktransformers.py

上文提到的 `KTransformersInterface::decode_one_tokens()` 实现，重载了 `TransformersInterface` 对应方法。
cuda graph 相关的实现也比较简单。如果是首次调用该函数会初始化 `CUDAGraphRunner`，然后 `CUDAGraphRunner::capture` 启动图捕获，借助 model 进行推理得到 logits 转换成 token。
然后再次调用时发现 `CUDAGraphRunner` 已经构造好了，就直接把参数传给 `CUDAGraphRunner::forward`。


### ktransformers/util/utils.py

`prefill_and_generate`，这个函数就是给 `ktransformers/local_chat.py` 用的，它是个用来调试的命令行工具。
值得注意的是整个项目目前支持的模型列表也是定义在 `ktransformers/local_chat.py` 这里的 = = 这个结构组织得有点乱，于是你可以看到在 KTransformersInterface 里面是  `from ktransformers.local_chat import custom_models, default_optimize_rules` 获取支持的模型列表和用于调优的 YAML 文件。

```python
custom_models = {
    "DeepseekV2ForCausalLM": DeepseekV2ForCausalLM,
    "Qwen2MoeForCausalLM": Qwen2MoeForCausalLM,
    "MixtralForCausalLM": MixtralForCausalLM,
}

ktransformer_rules_dir = os.path.dirname(os.path.abspath(__file__)) + "/optimize/optimize_rules/"
default_optimize_rules ={
    "DeepseekV2ForCausalLM": ktransformer_rules_dir + "DeepSeek-V2-Chat.yaml",
    "Qwen2MoeForCausalLM": ktransformer_rules_dir + "Qwen2-57B-A14B-Instruct.yaml",
    "MixtralForCausalLM": ktransformer_rules_dir + "Mixtral.yaml",
}
```