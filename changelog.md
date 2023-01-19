- 自动从目录提取博客、Front-matter，见 `blog/.vitepress/theme/serverUtils.ts`。

- 为`markdown-it-katex`标注了类型/更新了`katex`版本，见`blog/.vitepress/theme/markdown-it-katex.ts`。

- 抄了 `@vuepress/plugin-back-to-top`，见 `blog/.vitepress/theme/components/BackToTop.vue`。

- 添加了`Google Analytics 4` 支持，替换掉之前过时的 Universal Google Analytics，见 `blog/.vitepress/theme/ga4.ts`。

- 自动化部署脚本见 `.github/workflow/deploy.yml`，需要修改 `destination-github-username`、`destination-repository-name`，由于是向另一个分支强制推送，还需要在项目的 `Settings/Secrets` 下添加 GitHub Token。

- 本地部署需要在`blog/.vuepress/`下新建`secret.ts`。

    ```typescript
    // blog/.vitepress/secret.ts
    export const GITALK_ID = '';
    export const GITALK_SECRET = '';
    export const ALGOLIA_ID = '';
    export const ALGOLIA_SECRET = '';
    ```
    
    自动化部署时，需要在项目的 `Settings/Secrets` 下添加相应的配置信息，脚本会抽取它在构建的过程中自动生成该文件。
---

- 参考 [vitepress-blog-zaun](https://github.com/clark-cui/vitepress-blog-zaun) 和 [vue/doc](https://github.com/vuejs/docs) 迁移 [blog](https://github.com/Forsworns/blog)

- 基于 VitePress 1.0.0-alpha.38
