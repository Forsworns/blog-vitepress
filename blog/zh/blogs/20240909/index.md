---
title: ollama 源码阅读
description: 推理服务器
tags: 
- LLM
- AI
- GPU
- CUDA
---

[[toc]]

基于 https://github.com/ollama/ollama/tree/123a722a6f541e300bc8e34297ac378ebe23f527

ollama 是一个通用的 llm 推理服务器，借助 llama.cpp 进行推理。
ollama 0.1.44 镜像内，将 llama.cpp 编写的推理服务器放到了 /tmp/ollama1917690259/runners/下，以 cuda 后端为例，为 /tmp/ollama1917690259/runners/cuda_v11/ollama_llama_server。
当我们调用 ollama serve后，只会启动一个 go 编写的 server；当我们执行 ollama run qwen:7b它会拉起 llama.cpp server，然后作为反向代理转发我们的请求给 lamma.cpp server。

## gpu/gpu.go

一开始看 ollama 的代码是碰到了问题，想看下 go server 侧为什么会调用到 cuda API。

GetGPUInfo()->initCudaHandles()这里会打开 libnvidia-ml.so、libcuda.so、libcudart.so。
会去找这些库中的一些符号，go server 运行期间通过 cgo 调用他们。

## server/routes.go

`func Serve(ln net.Listener)` 函数也就是调用 ollama serve时执行的函数，它在启动 go server 前会去调用上面提到的`GetGPUInfo()`获取 GPU 信息。

看下这个文件的其他内容

`func (s *Server) GenerateRoutes()` 配置路由和对应的 handler。
以  `r.POST("/api/embeddings", s.EmbeddingsHandler)` 为例，`func (s *Server) EmbeddingsHandler(c *gin.Context)` 中解析请求参数，调用 `s.sched.GetRunner` 阻塞直到获取到 runner。
再调用 runner.llama.Embedding 获取 llama.cpp 中的模型服务，获取响应返回给用户。

```go
func (s *Server) EmbeddingsHandler(c *gin.Context) {
    var req api.EmbeddingRequest
    err := c.ShouldBindJSON(&req)
    model, err := GetModel(req.Model)
    opts, err := modelOptions(model, req.Options)

    rCh, eCh := s.sched.GetRunner(c.Request.Context(), model, opts, req.KeepAlive.Duration)
    var runner *runnerRef
    select {
    case runner = <-rCh:
    case err = <-eCh:
        handleErrorResponse(c, err)
        return
    }

    embedding, err := runner.llama.Embedding(c.Request.Context(), req.Prompt)

    resp := api.EmbeddingResponse{
        Embedding: embedding,
    }
    c.JSON(http.StatusOK, resp)
}
```

## server/sched.go

除了直接调用 `GetGPUInfo()`，该函数还可能通过该文件下的 `Scheduler.getGpuFn` 函数指针调用，包含下面两个调用处
- func (s *Scheduler) processPending(ctx context.Context)
- func (runner *runnerRef) waitForVRAMRecovery()



看下这个文件的其他内容

`runnerRef` 是调度的实体，对应请求中的 `req.model.ModelPath`，为这个模型启动 llama.cpp 服务器。

`GetRunner`，把用户请求 req 写入了 `s.pendingReqCh`，如果失败了把错误写入到 `req.errCh`，没有失败的时候，会阻塞在 `req.successCh`。

```go
func (s *Scheduler) GetRunner(c context.Context, model *Model, opts api.Options, sessionDuration time.Duration) (chan *runnerRef, chan error) {
    req := &LlmRequest{
        ctx:             c,
        model:           model,
        opts:            opts,
        sessionDuration: sessionDuration,
        successCh:       make(chan *runnerRef),
        errCh:           make(chan error, 1),
    }
    select {
    case s.pendingReqCh <- req:
    default:
        req.errCh <- ErrMaxQueue
    }
    return req.successCh, req.errCh
}
```

`Run` 函数会创建两个 go routine 去分别处理等待队列和完成队列，刚刚的 `s.pendingReqCh
` 中的请求就是在 `processPending` 中处理的。任务成功后写回到 `req.successCh`。

```go
func (s *Scheduler) Run(ctx context.Context) {
    go func() {
        s.processPending(ctx)
    }()
    go func() {
        s.processCompleted(ctx)
    }()
}
```

`func (s *Scheduler) load(req *LlmRequest, ggml *llm.GGML, gpus gpu.GpuInfoList)` 调用 `Scheduler.newServerFn`，也就是 `llm/server.go` 中的 `NewLlamaServer` 创建 llama.cpp 服务；同时创建调度实体 `runnerRef`。

`func (s *Scheduler) findRunnerToUnload()` 用来寻找一个最合适被关闭的 runnerRef，会先去看 runner.refCount 这个引用计数，看是否有空闲的 runnerRef，如果有就把它关闭；否则就给所有 runnerRef 按 runnerRef.sessionDuration 排序，返回马上要执行完成的 runner。

## initCudaHandles中寻找的符号
- gpu/gpu_info_nvcuda.h：cuda_handle_t
- gpu/gpu_info_cudart.h：cudart_handle_t
- gpu/gpu_info_nvml.h：nvml_handle_t


