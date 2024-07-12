---
title: Let's reproduce GPT-2 笔记
description: 学习了一下 Andrej Karpathy 大神的 GPT-2 视频课程
tags: 
- LLM
- AI
---

[[toc]]

之前看了 Andrej Karpathy 的 Tokenizer 视频，最近他又发了一个从零复现 GPT-2 的视频，学习一个。

相关博客

网上读到 Maeiee 记录的，Karpathy 之前另一期从零搭建 GPT 视频的学习笔记 [Let's build GPT：from scratch, in code, spelled out.](https://garden.maxieewong.com/087.%E8%A7%86%E9%A2%91%E5%BA%93/YouTube/Andrej%20Karpathy/Let%27s%20build%20GPT%EF%BC%9Afrom%20scratch,%20in%20code,%20spelled%20out./#step6-bigram-language-model-v1)。


仓库地址

- 视频配套的教学仓库 build-nanogpt: https://github.com/karpathy/build-nanogpt
- nanoGPT: https://github.com/karpathy/nanoGPT
- llm.c: https://github.com/karpathy/llm.c

[视频地址](https://www.youtube.com/watch?v=l8pRSuU81PU)

论文

- Transformer：[Attention is All You Need](https://arxiv.org/abs/1706.03762)
- GPT-2：[Language Models are Unsupervised Multitask Learners](https://d4mucfpksywv.cloudfront.net/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)，论文中的参数配置信息不够具体，需要参考 GPT-3 的论文。
- GPT-3：[Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) 


## 引言

复现的是 124M 的模型，原始论文中的参数统计数据有误。该模型由 12个 768 channel、768 dimension 的 transformer 构成。

借助 HuggingFace 的 transformers 库，打印了 GPT-2 中的张量信息。首先是输入层，tokenizer embedding 的规模是 50257，每个 token 被表示为 768 维的向量，所以 wte 是一个 50257x768 的矩阵；position embedding 上下文长度为 1024，每个位置由 768 维的向量编码，所以 wpe 是一个 1024x768 的矩阵。
原始 transformer 文章使用固定的正弦余弦波来做位置编码（考虑到正弦波的加法性质），GPT-2将位置编码也参数化了。

