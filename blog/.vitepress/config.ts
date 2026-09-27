import { getBlogs } from "./theme/serverUtils";
import mdKatex from "./theme/markdown-it-katex";
import { buildBlogRSS } from "./theme/rss";
import * as SECRETS from "./secret";
import MarkdownIt from "markdown-it";

async function configs() {
  return {
    title: "Sharlayan",
    // VitePress 1.x makes dead links fatal, where the alpha only warned. These two
    // are pre-existing content bugs, allowlisted individually so the check stays
    // active for every other link.
    ignoreDeadLinks: [
      // zh/blogs/20210311/index.md: URL scheme is missing, so it resolves
      // relative to the current page
      (link: string) => link.includes("polycube-network.readthedocs.io"),
      // zh/blogs/20210715/index.md: the 8.1MB eBPF.pptx lives in the content
      // dir and is not tracked as a page or asset by VitePress
      (link: string) => link.endsWith("eBPF.pptx"),
    ],
    head: [
      // live2d widget
      [
        "script",
        {
          src: "https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js",
        }
      ],
      // KaTex stylesheet for markdown-it-katex
      [
        "link",
        {
          rel: "stylesheet",
          href:
            "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.18.9/katex.min.css",
        },
      ],
      // markdown-it 
      [
        "link",
        {
          rel: "stylesheet",
          href:
            "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css",
        },
      ],
      // font-awesome
      [
        "link",
        {
          rel: "stylesheet",
          href:
            "https://cdn.jsdelivr.net/npm/font-awesome/css/font-awesome.min.css",
        },
      ],
      // ionicons used in `about-me` page
      [
        "link",
        {
          rel: "stylesheet",
          href: "https://cdn.staticfile.org/ionicons/2.0.1/css/ionicons.min.css",
        },
      ],
      // site resources
      [
        "link",
        {
          rel: "icon",
          type: "image/png",
          href: "/logo.png",
        },
      ],
      [
        "meta",
        {
          name: "author",
          content: "Peihao Yang",
        },
      ],
      [
        "meta",
        {
          property: "og:title",
          content: "Home",
        },
      ],
      [
        "meta",
        {
          property: "og:description",
          content: "Home of Peihao Yang",
        },
      ],
    ],
    locales: {
      root: {
        label: 'English', lang: 'en',
        description: "Personal Blog",
        themeConfig: {
          lastUpdatedText: "Last Updated",
          nav: [
            { text: "🏡Homepage", link: "/" },
            { text: "🦹‍♂️About Me", link: "/about-me/" },
            {
              text: "📓Blogs",
              items: [
                { text: "📃Archives", link: "/zh/blogs/" },
                { text: "🔖Tags", link: "/zh/blogs/tags/" },
              ],
            },
            {
              text: "🔥RSS",
              link: "https://forsworns.github.io/feed.xml",
            },
          ],
        }
      },
      zh: {
        label: '中文', lang: 'zh-CN', link: '/zh/',
        description: "个人博客",
        themeConfig: {
          lastUpdatedText: "上次更新",
          nav: [
            { text: "🏡主页", link: "/zh/" },
            { text: "🦹‍♂️关于我", link: "/zh/about-me/" },
            {
              text: "📓博客",
              items: [
                { text: "📃所有博客", link: "/zh/blogs/" },
                { text: "🔖标签分类", link: "/zh/blogs/tags/" },
              ],
            },
            {
              text: "🔥RSS",
              link: "https://forsworns.github.io/feed.xml",
            },
          ],
        }
      },
    },
    themeConfig: {
      logo: "/assets/logo.png",
      homeLottie: "/assets/lottie-developer.json",
      i18nRouting: false,
      // refer to the `VPNavBarTitle.vue` in default theme,
      // we have to set it to null to disable the text in navigation bar,
      // the undefined is not applicable here,
      siteTitle: null,
      blogs: await getBlogs(),
      // select two latest posts to display on the index page
      latestNum: 2,
      // utterances comments configurations
      // unlike gitalk, utterances needs no OAuth client id/secret
      utterances: {
        repo: "Forsworns/blog-vitepress",
        issueTerm: "pathname",
        label: "Comment",
      },
      // algolia search configurations
      algolia: {
        indexName: 'forswornsio',
        appId: SECRETS.ALGOLIA_ID,
        apiKey: SECRETS.ALGOLIA_SECRET,
      },
      socialLinks: [
        { icon: "github", link: "https://github.com/forsworns/blog-vitepress" },
        {
          icon: {
            svg: `<svg role="img" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="20">
            <path d="M874.666667 375.189333V746.666667a64 64 0 0 1-64 64H213.333333a64 64 0 0 1-64-64V375.189333l266.090667 225.6a149.333333 149.333333 0 0 0 193.152 0L874.666667 375.189333zM810.666667 213.333333a64.789333 64.789333 0 0 1 22.826666 4.181334 63.616 63.616 0 0 1 26.794667 19.413333 64.32 64.32 0 0 1 9.344 15.466667c2.773333 6.570667 4.48 13.696 4.906667 21.184L874.666667 277.333333v21.333334L553.536 572.586667a64 64 0 0 1-79.893333 2.538666l-3.178667-2.56L149.333333 298.666667v-21.333334a63.786667 63.786667 0 0 1 35.136-57.130666A63.872 63.872 0 0 1 213.333333 213.333333h597.333334z" ></path>
            </svg>`,
          },
          link: "mailto:peihao.young@gmail.com",
        },
      ],
    },
    markdown: {
      config: (md: MarkdownIt) => {
        md.use(mdKatex);
      },
    },
    buildEnd: buildBlogRSS,
  };
}

export default configs();