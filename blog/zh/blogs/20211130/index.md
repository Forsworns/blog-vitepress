---
title: Do not use `#[serde(deny_unknown_fields)]` on k8s CRD struct
description: 为 Sentinel-Rust 添加 k8s 数据源支持时，用 kube-rs 的时候碰到的一个有趣的问题
tags: 
- Rust
- 云原生
- 一点趣事
- Sentinel
---

[[toc]]

# Do not use `#[serde(deny_unknown_fields)]` on k8s CRD struct

This blog records a potential problem in Rust when using `kube-rs`, `serde` and `schemars` together: Do not use `#[serde(deny_unknown_fields)]` on k8s CRD spec struct.

Here is a minimal example: Simply add `#[serde(deny_unknown_fields)]` in the `kube-rs` official example.

```rust
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::json;
use validator::Validate;
use futures::{StreamExt, TryStreamExt};
use k8s_openapi::apiextensions_apiserver::pkg::apis::apiextensions::v1::CustomResourceDefinition;
use kube::{
    api::{Api, DeleteParams, ListParams, PatchParams, Patch, ResourceExt},
    core::CustomResourceExt,
    Client, CustomResource,
    runtime::{watcher, utils::try_flatten_applied, wait::{conditions, await_condition}},
};

// Our custom resource
#[derive(CustomResource, Deserialize, Serialize, Clone, Debug, Validate, JsonSchema)]
#[kube(group = "clux.dev", version = "v1", kind = "Foo", namespaced)]
#[serde(deny_unknown_fields)] // here we add the macro
pub struct FooSpec {
    info: String,
    #[validate(length(min = 3))]
    name: String,
    replicas: i32,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::try_default().await?;
    let crds: Api<CustomResourceDefinition> = Api::all(client.clone());

    // Apply the CRD so users can create Foo instances in Kubernetes
    crds.patch("foos.clux.dev",
        &PatchParams::apply("my_manager"),
        &Patch::Apply(Foo::crd())
    ).await?;

    // Wait for the CRD to be ready
    tokio::time::timeout(
        std::time::Duration::from_secs(10),
        await_condition(crds, "foos.clux.dev", conditions::is_crd_established())
    ).await?;

    // Watch for changes to foos in the configured namespace
    let foos: Api<Foo> = Api::default_namespaced(client.clone());
    let lp = ListParams::default();
    let mut apply_stream = try_flatten_applied(watcher(foos, lp)).boxed();
    while let Some(f) = apply_stream.try_next().await? {
        println!("saw apply to {}", f.name());
    }
    Ok(())
}
```

Then you will get an error:
> Error: Api(ErrorResponse { status: "Failure", message: "CustomResourceDefinition.apiextensions.k8s.io \"foos.clux.dev\" is invalid: spec.validation.openAPIV3Schema.properties[spec].additionalProperties: Forbidden: additionalProperties and properties are mutual exclusive", reason: "Invalid", code: 422 })

**Why?**

Because in json schema <sup>[1]</sup>:
> By default, providing additional properties is valid (unless you set `additionalProperties` to false).

While in `serde` <sup>[2]</sup>:
> Always error during deserialization when encountering unknown fields. When this attribute is not present, by default unknown fields are ignored for self-describing formats like JSON.

The `schemars` is compatible with serde. There's no surprise that field `additionalProperties` is set to false when the struct is with `#[serde(deny_unknown_fields)]`.

Then the "unexpected" problem with `kube-rs` looms. The generated CRD struct `Foo` will contain the spec struct `FooSpec` annotated with `#[serde(deny_unknown_fields)]`, which has an attribute `additionalProperties` of value `false`. This voilates the  restrictions that applied to the CRD schema<sup>[3]</sup>:
> The field `additionalProperties` cannot be set to false. The field `additionalProperties` is mutually exclusive with properties.

[1] http://json-schema.org/understanding-json-schema/reference/object.html#id5

[2] https://serde.rs/container-attrs.html#deny_unknown_fields

[3] https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#validation




## Sentinel-Rust Resources

[Tutorial](https://github.com/sentinel-group/sentinel-rust/wiki)
[ API Doc](https://docs.rs/sentinel-core/latest/sentinel_core/)
[Example Codes](https://github.com/sentinel-group/sentinel-rust/tree/main/examples)