---
title: Sentinel-Rust Middleware Supports
description: Read examples, plz.
tags: 
- Rust
- Sentinel
- 中间件
---

[[toc]]

# Sentinel-Rust Middleware Supports

Currently [Sentinel-Rust](https://github.com/sentinel-group/sentinel-rust) supports following RPC/Web frameworks, and provides thorough [examples](https://github.com/sentinel-group/sentinel-rust/tree/main/middleware).

## Tonic

[Tonic](https://crates.io/crates/tonic) is A rust implementation of [gRPC](https://grpc.io/), a high performance, open source, general RPC framework that puts mobile and HTTP/2 first.

The are two kinds of middlewares in Tonic.

\- [`tonic::service::interceptor::Interceptor`](https://docs.rs/tonic/latest/tonic/service/interceptor/trait.Interceptor.html)

\- [`tower::Service`](https://docs.rs/tower/latest/tower/trait.Service.html)

We have implemented both of them, see [sentinel-tower](https://crates.io/crates/sentinel-tower) and [sentinel-tonic](https://crates.io/crates/sentinel-tonic) on crates.io.

Here is a [post](https://forsworns.github.io/zh/blogs/20221108/) related to its implementation.

## Volo

[Volo](https://crates.io/crates/volo) is a high-performance and strong-extensibility Rust RPC framework that helps developers build microservices.

Different from the Tower in Tonic, Volo uses the [Motore](https://github.com/cloudwego/motore) for service abstraction.

For more information, see [sentinel-motore](https://crates.io/crates/sentinel-motore) on crates.io. 

Here is a [post](https://forsworns.github.io/zh/blogs/20221108/) related to its implementation.

## Actix Web

[Actix Web](https://crates.io/crates/actix-web) is a powerful, pragmatic, and extremely fast web framework for Rust

In general, a middleware in Actix Web is a type that implements the [Service trait](https://docs.rs/actix-web/4/actix_web/dev/trait.Service.html) and [Transform trait](https://docs.rs/actix-web/4/actix_web/dev/trait.Transform.html). 

For more information, see [sentinel-actix](https://crates.io/crates/sentinel-actix) on crates.io.

Here is a [post](https://forsworns.github.io/zh/blogs/20221108/) related to routers and handlers in the Actix-Web.

## Rocket

[Rocket](https://crates.io/crates/rocket) is a web framework for Rust that makes it simple to write fast, secure web applications without sacrificing flexibility, usability, or type safety.

There are two ways to implement a Sentinel middleware in Rocket.

Intuitively, we can implement the [`Fairing`](https://api.rocket.rs/v0.5-rc/rocket/fairing/trait.Fairing.html) trait, just as the common `Service` traits in other frameworks.

However, as documented in the Rocket guide, 

> Rocket’s fairings are a lot like middleware from other frameworks, but they bear a few key distinctions:
> - Fairings **cannot** terminate or respond to an incoming request directly.
> - Fairings **cannot** inject arbitrary, non-request data into a request.
> - Fairings *can* prevent an application from launching.
> - Fairings *can* inspect and modify the application's configuration.

Since it cannot terminate or respond to the request directly, the implemented `SentinelFairing` simply rewrites the URI in the Request to a given route. It can be configured via its own methods or [managed state](https://rocket.rs/v0.5-rc/guide/state/#managed-state) of `SentinelConfig`. 

In fact, Rocket [suggests](https://rocket.rs/v0.5-rc/guide/fairings/#overview) using request guards, instead of Fairing in this case,

> As a general rule of thumb, only *globally applicable* actions should be effected through fairings. You should ***not\*** use a fairing to implement authentication or authorization (preferring to use a [request guard](https://rocket.rs/v0.5-rc/guide/requests/#request-guards) instead) *unless* the authentication or authorization applies to all or the overwhelming majority of the application. On the other hand, you *should* use a fairing to record timing and usage statistics or to enforce global security policies.

So we follow this [suggestion](https://rocket.rs/v0.5-rc/guide/requests/#request-guards) 

> Request guards appear as inputs to handlers. An arbitrary number of request guards can appear as arguments in a route handler. Rocket will automatically invoke the [`FromRequest`](https://api.rocket.rs/v0.5-rc/rocket/request/trait.FromRequest.html) implementation for request guards before calling the handler. Rocket only dispatches requests to a handler when all of its guards pass.

and implemented a `SentinelGuard`. It can be configured via the [managed state](https://rocket.rs/v0.5-rc/guide/state/#managed-state) of `SentinelConfig`,

For more information, see [sentinel-rocket](https://crates.io/crates/sentinel-rocket) on crates.io.

## Axum

[Axum]() is a web application framework that focuses on ergonomics and modularity.

> In particular the last point is what sets `axum` apart from other frameworks. `axum` doesn't have its own middleware system but instead uses [`tower::Service`](https://docs.rs/tower/latest/tower/trait.Service.html). This means `axum` gets timeouts, tracing, compression, authorization, and more, for free. It also enables you to share middleware with applications written using [`hyper`](https://crates.io/crates/hyper) or [`tonic`](https://crates.io/crates/tonic).

Therefore, we can reuse the middleware in [sentinel-tower](https://crates.io/crates/sentinel-tower). For more information, visit our [example for Axum](https://github.com/sentinel-group/sentinel-rust/tree/main/middleware/axum).

## One More Thing

Currently, [dynamic datasources](https://github.com/sentinel-group/sentinel-rust/wiki/Usage#via-dynamic-datasource) for sentinel are implemented directly in [sentinel-core](https://crates.io/crates/sentinel-core) as customized features. Maybe similar to these middlewares, splitting datasources into individual crates or a single crate with customized features is better... 

## Sentinel-Rust Resources

[Tutorial](https://github.com/sentinel-group/sentinel-rust/wiki)
[ API Doc](https://docs.rs/sentinel-core/latest/sentinel_core/)
[Example Codes](https://github.com/sentinel-group/sentinel-rust/tree/main/examples)
