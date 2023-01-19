---
title: 想要一只看板娘
description: 基于Vuepress搭建的博客的美化
tags: 
- 博客搭建
- 配环境
---

# 想要一只看板娘

[[toc]]

这个博客是用Vuepress搭建的，每次看到别人很好康的博客，就自惭形秽。

最近在读别人的博客的时候，发现人家也是用的Vuepress，但是里面有看板娘，心动了，我也来试一试。

调查了一下，这方面集成度比较高的有Vuepress插件[vuepress-plugin-helper-live2d](https://github.com/JoeyBling/vuepress-plugin-helper-live2d)。但是该插件仅提供了一个Live2D的模型展示；后面又找了一下，发现之前看到的是[Live2D Widget](https://github.com/stevenjoezhang/live2d-widget)这个项目，作者提供了后端可以支持多种模型切换、换装。

Live2D Widget的默认使用方法很简单，在head里加载上就行了。那么对Vuepress来说，只需要在[`blog/.vuepress/config.js`](https://github.com/Forsworns/blog/tree/master/blog/.vuepress)中添加

```javascript
module.exports = {
	head:{
		['link', { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/font-awesome/css/font-awesome.min.css" }],
        ['script', { src: "https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js" }],
    }   
}
```

现在左下角有了Live2D模型了，虽然没有什么用:see_no_evil:，但是很好看。

其实该博客在搭建的时候还是踩了一些坑的，但是因为还在搭建博客……之前就没有写总结，现在又快忘光了。从仅有的[README](https://github.com/Forsworns/blog)和代码中，我之前是给每个页面单独定义过[Layout组件](https://github.com/Forsworns/blog/tree/master/blog/.vuepress)的（见`blog/.vuepress/components/*Layout.vue`）。之后有空去考虑只在BlogLayout.vue中显示看板娘吧，应该可以参考另一篇[博文](https://blog.csdn.net/qq_36357242/article/details/100063063)。

