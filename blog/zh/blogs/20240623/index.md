---
title: ollama/llama.cpp 源码阅读
description: 最开始是想看下为什么 cuda graph 没有被启用
tags: 
- llm
- gpu
---

[[toc]]

## ollama

ollama基于 https://github.com/ollama/ollama/blob/ccef9431c8aae4ecfd0eec6e10377d09cb42f634

### llm/
#### server.go

go 写的 server，主体为 [`NewLlamaServer`](https://github.com/ollama/ollama/blob/ccef9431c8aae4ecfd0eec6e10377d09cb42f634/llm/server.go#L80)

它会拉起多个进程，分别执行下面的 ext_server/server.cpp 中，基于 llama.cpp 实现的真正做推理服务的 server。

#### ext_server/server.cpp

把 llama.cpp 导入成了一个 submodule，基于 llama.cpp 开发的一个推理服务器。

## llama.cpp

llama.cpp 基于 https://github1s.com/ggerganov/llama.cpp/blob/45c0e2e4c1268c2d7c8c45536f15e3c9a731ecdc/llama.h

看编译脚本上是默认开 cuda graph 优化，但是用 ollama 起的服务器跑的时候没有用到。

CmakeLists.txt 里面声明了只要找到了 libcuda，就会定义 GGML_CUDA_USE_GRAPHS 开启 cuda graph 优化。Makefile 中同样，只要是声明了 `make LLAMA_CUDA=1` 就会定义 `GGML_CUDA_USE_GRAPHS` 开启 cuda graph 优化。

### llama.cpp

对外的 llama.cpp 库 API 实现

### ggml.c

被 llama.cpp 包了一层的内部 API

### ggml-backend.c

不同的后端通过 `ggml_backend_register` 注册自身，`ggml_backend_registry_init` 运行时分别调用他们，这里利用了一个技巧避免引入头文件。

```cpp
GGML_CALL static void ggml_backend_registry_init(void) {
    ggml_backend_register("CPU", ggml_backend_reg_cpu_init, ggml_backend_cpu_buffer_type(), NULL);

    // add forward decls here to avoid including the backend headers
#ifdef GGML_USE_CUDA
    extern GGML_CALL void ggml_backend_cuda_reg_devices(void);
    ggml_backend_cuda_reg_devices();
#endif
    // …
}
```

实现 `static struct ggml_backend_i cpu_backend_i ` 后端。

### ggml-blas.cpp

实现 `static struct ggml_backend_i blas_backend_i` 后端。


### ggml-cuda.cu

实现 `static ggml_backend_i ggml_backend_cuda_interface` 后端。

cuda graph 是由 https://github.com/ggerganov/llama.cpp/commit/bc4bba364fb96d908f2698e908648df5e6f55e02 这个 commit-bc4b 引入的。

### ggml-cuda

#### cpy.cuh

commit-bc4b 为 `struct ggml_backend_cuda_context` 新增了一个成员，`std::unique_ptr<ggml_cuda_graph> cuda_graph`。看上去一个 context 只会捕获出一个 cuda graph。

结构体 `ggml_cuda_graph` 在析构的时候会自动调用 `cudaGraphExecDestroy` 和 `cudaGraphDestroy` 清理之前捕获到的 cuda graph。它的定义比较简单，如下

```cpp
struct ggml_cuda_graph {
    cudaGraph_t graph = nullptr;
    cudaGraphExec_t instance = nullptr;
    size_t num_nodes = 0;
    std::vector<cudaGraphNode_t> nodes;
    std::vector<cudaKernelNodeParams> params;
    // 禁用该 feature 的几种可能的原因
    bool disable_due_to_gpu_arch = false;
    // 如果当前用例中，图节点更新得太快，那图需要一直重建，建图的开销可能会大于 cuda graph 节省的开销。
    bool disable_due_to_too_many_updates = false;
    bool disable_due_to_failed_graph_capture = false;
    int number_consecutive_updates = 0;
    std::vector<ggml_graph_node_properties> ggml_graph_properties;
    std::vector<char **> updated_kernel_arg;
};

struct ggml_graph_node_properties {
    void * node_address;
    // 同 `ggml_tensor` 上的 `ggml_op`，例如 `GGML_OP_CPY`、`GGML_OP_VIEW`
    ggml_op node_op;
    // 同 `ggml_tensor` 上的 `ne`
    int64_t ne[GGML_MAX_DIMS];
    // 同 `ggml_tensor` 上的 `nb`
    size_t nb[GGML_MAX_DIMS];
    // 同 `ggml_tensor` 上的 `src[i]->data`
    void * src_address[GGML_MAX_SRC];
};
```

`set_ggml_graph_node_properties` 从一个 `ggml_tensor` 构建一个 `ggml_graph_node_properties`，转换成图里的节点。
`ggml_graph_node_has_matching_properties` 比较 `ggml_tensor` 和 `ggml_graph_node_properties` 的成员，判断二者是否匹配。

`ggml_backend_cuda_graph_compute` 中根据参数 `ggml_backend_t` 和 `ggml_cgraph` 去构建 `ggml_backend_t->ggml_backend_cuda_context->ggml_cuda_graph`。这个函数里面首先检查了是不是安培以下的 GPU，如果是，就不用 cuda graph 了。之前在 T4 上测试的，所以没用到 cuda graph。有点坑爹 release 模式下不开 `LLAMA_DEBUG`，这错误日志就不打了。

```cpp
GGML_CALL static enum ggml_status ggml_backend_cuda_graph_compute(ggml_backend_t backend, ggml_cgraph * cgraph) {
    // ...
    if (cuda_ctx->cuda_graph->graph == nullptr) {
        if (ggml_cuda_info().devices[cuda_ctx->device].cc < CC_AMPERE) {
            cuda_ctx->cuda_graph->disable_due_to_gpu_arch = true;
#ifndef NDEBUG
            GGML_CUDA_LOG_WARN("%s: disabling CUDA graphs due to GPU architecture\n", __func__);
#endif
        }
    }
    // ...
}
```

如果启用 cuda graph，则比较当前传入的 `ggml_cgraph` 和之前当前的 cuda graph 是否相同

```cpp
GGML_CALL static enum ggml_status ggml_backend_cuda_graph_compute(ggml_backend_t backend, ggml_cgraph * cgraph) {
    // ...
    if (cuda_ctx->cuda_graph->instance == nullptr) {
        cuda_graph_update_required = true;
    }

    // Check if the graph size has changed
    if (cuda_ctx->cuda_graph->ggml_graph_properties.size() != (size_t)cgraph->n_nodes) {
        cuda_graph_update_required = true;
        cuda_ctx->cuda_graph->ggml_graph_properties.resize(cgraph->n_nodes);
    }

    // Loop over nodes in GGML graph to determine if CUDA graph update is required
    // and store properties to allow this comparison for the next token
    for (int i = 0; i < cgraph->n_nodes; i++) {
        bool has_matching_properties = true;
        if (!cuda_graph_update_required) {
            has_matching_properties = ggml_graph_node_has_matching_properties(cgraph->nodes[i], &cuda_ctx->cuda_graph->ggml_graph_properties[i]);
        }
        if (!has_matching_properties) {
            cuda_graph_update_required = true;
        }
        set_ggml_graph_node_properties(cgraph->nodes[i], &cuda_ctx->cuda_graph->ggml_graph_properties[i]);
    }
    // ...
}
```
再次遍历当前的 `ggml_cgraph`，更新 `GGML_OP_CPY` 类型节点的信息，因为拷贝操作的地址会随着 token 变化。

```cpp
GGML_CALL static enum ggml_status ggml_backend_cuda_graph_compute(ggml_backend_t backend, ggml_cgraph * cgraph) {
    // ...
    // Loop over nodes in GGML graph to obtain info needed for CUDA graph
    cuda_ctx->cuda_graph->updated_kernel_arg.clear();
    for (int i = 0; i < cgraph->n_nodes; i++) {
        ggml_tensor * node = cgraph->nodes[i];

        if (node->src[0] && ggml_backend_buffer_is_cuda_split(node->src[0]->buffer)) {
            use_cuda_graph = false; // Split buffers are not supported by CUDA graph capture
        }

        if (node->op == GGML_OP_MUL_MAT_ID) {
            use_cuda_graph = false; // This node type is not supported by CUDA graph capture
        }

        if (node->op == GGML_OP_ADD && node->src[1] && node->src[1]->ne[1] > 1) {
            // disable CUDA graphs for batch size > 1 for now.
            // Changes in batch size or context size can cause changes to the grid size of some kernels.
            use_cuda_graph = false;
        }

        if (node->op == GGML_OP_CPY) {
            // store the copy op parameter which changes with each token.
            cuda_ctx->cuda_graph->updated_kernel_arg.push_back((char **) &(node->src[1]->data));
            // store a pointer to each copy op CUDA kernel to identify it later
            void * ptr = ggml_cuda_cpy_fn(node->src[0], node->src[1]);
            if (std::find(ggml_cuda_cpy_fn_ptrs.begin(), ggml_cuda_cpy_fn_ptrs.end(), ptr) == ggml_cuda_cpy_fn_ptrs.end()) {
                ggml_cuda_cpy_fn_ptrs.push_back(ptr);
            }
        }

        if (!use_cuda_graph) {
            break;
        }
    }

    // Disable CUDA graphs (from the next token) if the use-case is demanding too many consecutive graph updates.
    if (use_cuda_graph && cuda_graph_update_required) {
        cuda_ctx->cuda_graph->number_consecutive_updates++;
    } else {
        cuda_ctx->cuda_graph->number_consecutive_updates = 0;
    }
    // 连续四次 token 的推理（调用 `ggml_backend_cuda_graph_compute`），图都发生了变化，就放弃继续使用 cuda graph
    if (cuda_ctx->cuda_graph->number_consecutive_updates >= 4) {
        cuda_ctx->cuda_graph->disable_due_to_too_many_updates = true;
    }
    // ...
}
```

然后开始借助 cudaStreamBeginCapture 捕获下面的推理过程中的 CUDA API 调用。注意如果没有开启 cuda graph，下面的这段是每次需要 eager 地执行

```cpp
GGML_CALL static enum ggml_status ggml_backend_cuda_graph_compute(ggml_backend_t backend, ggml_cgraph * cgraph) {
    // ...
    // Only perform the graph execution if CUDA graphs are not enabled, or we are capturing the graph.
    // With the use of CUDA graphs, the execution will be performed by the graph launch.
    if (!use_cuda_graph || cuda_graph_update_required) {
        for (int i = 0; i < cgraph->n_nodes; i++) {
            ggml_tensor * node = cgraph->nodes[i];
            if (ggml_is_empty(node) || node->op == GGML_OP_RESHAPE || node->op == GGML_OP_TRANSPOSE || node->op == GGML_OP_VIEW || node->op == GGML_OP_PERMUTE || node->op == GGML_OP_NONE) {
                continue;
            }
            bool ok = ggml_cuda_compute_forward(*cuda_ctx, node);
            if (!ok) {
                GGML_CUDA_LOG_ERROR("%s: op not supported %s (%s)\n", __func__, node->name, ggml_op_name(node->op));
            }
            GGML_ASSERT(ok);
        }
    }
    // ...
}
```

捕获完成，调用 `cudaGraphInstantiate` 实例化 cuda graph 成 `cudaGraphExec`，再根据上面统计到的 `GGML_OP_CPY` 相关的信息，更新 cuda graph，最后调用 `cudaGraphExecUpdate` 更新 `cudaGraphExec`。

```cpp
GGML_CALL static enum ggml_status ggml_backend_cuda_graph_compute(ggml_backend_t backend, ggml_cgraph * cgraph) {
    // ...
    if (cuda_ctx->cuda_graph->instance == nullptr) { // Create executable graph from captured graph.
        CUDA_CHECK(cudaGraphInstantiate(&cuda_ctx->cuda_graph->instance, cuda_ctx->cuda_graph->graph, NULL, NULL, 0));
    }

    // Perform update to graph (if required for this token), and change copy parameter (required for every token)

    if (cuda_graph_update_required) {
        // Extract nodes from graph
        // First call with null argument gets number of nodes in graph
        CUDA_CHECK(cudaGraphGetNodes(cuda_ctx->cuda_graph->graph, nullptr, &cuda_ctx->cuda_graph->num_nodes));
        // Subsequent call with non-null argument gets nodes
        cuda_ctx->cuda_graph->nodes.resize(cuda_ctx->cuda_graph->num_nodes);
        cuda_ctx->cuda_graph->params.resize(cuda_ctx->cuda_graph->num_nodes);
        if (cuda_ctx->cuda_graph->num_nodes > 0) {
            CUDA_CHECK(cudaGraphGetNodes(cuda_ctx->cuda_graph->graph, cuda_ctx->cuda_graph->nodes.data(), &cuda_ctx->cuda_graph->num_nodes));

            // Loop over nodes, and extract kernel parameters from each node
            for (size_t i = 0; i < cuda_ctx->cuda_graph->num_nodes; i++) {
                cudaGraphNodeType node_type;
                CUDA_CHECK(cudaGraphNodeGetType(cuda_ctx->cuda_graph->nodes[i], &node_type));
                if (node_type == cudaGraphNodeTypeKernel) {
                    cudaError_t stat = cudaGraphKernelNodeGetParams(cuda_ctx->cuda_graph->nodes[i], &cuda_ctx->cuda_graph->params[i]); // Get params using runtime
                    if (stat == cudaErrorInvalidDeviceFunction) {
                        // Fails due to incorrect handling by CUDA runtime of CUDA BLAS node.
                        // We don't need to update blas nodes, so clear error and move on.
                        cudaGetLastError();
                    } else {
                        GGML_ASSERT(stat == cudaSuccess);
                    }
                }
            }
        }
    }

    // One of the arguments to the copy kernel is updated for each token, hence we need to
    // replace that argument with the updated value in the CUDA graph
    if (!cuda_graph_update_required) { // on update steps, the live parameters will already be captured
        int k = 0;
        for (size_t i = 0; i < cuda_ctx->cuda_graph->num_nodes; i++) {
            if(count(ggml_cuda_cpy_fn_ptrs.begin(), ggml_cuda_cpy_fn_ptrs.end(), cuda_ctx->cuda_graph->params[i].func) > 0) {
                char ** updated_kernel_arg_ptr = cuda_ctx->cuda_graph->updated_kernel_arg.at(k++);
                cuda_ctx->cuda_graph->params[i].kernelParams[1] = updated_kernel_arg_ptr;
                CUDA_CHECK(cudaGraphKernelNodeSetParams(cuda_ctx->cuda_graph->nodes[i], &cuda_ctx->cuda_graph->params[i]));
            }
        }
    }

    // Update graph executable
    cudaGraphExecUpdateResultInfo result_info;
    cudaError_t stat = cudaGraphExecUpdate(cuda_ctx->cuda_graph->instance, cuda_ctx->cuda_graph->graph, &result_info);
    // ...
}
```

有了新的 `cudaGraphExec`，就可以运行这个图了。

#### cpy.cu

commit-bc4b 定义了一个通用的函数 `ggml_cuda_cpy_fn` 根据张量类型选择拷贝函数。

### examples

#### simple

https://github1s.com/ggerganov/llama.cpp/blob/45c0e2e4c1268c2d7c8c45536f15e3c9a731ecdc/examples/simple/simple.cpp

一个简单 llama.cpp 应用用例。