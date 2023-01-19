// customized theme
import DefaultTheme from "vitepress/theme";
import { EnhanceAppContext } from 'vitepress/client'
import MyLayout from "./components/MyLayout.vue";
import "./custom.css";
// global compenents
import AboutMe from "./components/about-me/AboutMe.vue";
import BlogTimeline from "./components/blogs/BlogTimeline.vue";
import BlogTags from "./components/blogs/BlogTags.vue";
// element-plus 
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import googleAnalytics from './ga4';

export default {
  ...DefaultTheme,
  Layout: MyLayout,
  enhanceApp(ctx: EnhanceAppContext) {
    DefaultTheme.enhanceApp(ctx);
    const { app, router } = ctx;
    googleAnalytics(router);
    app.use(ElementPlus);
    // register global components
    app.component("AboutMe", AboutMe);
    app.component("BlogTimeline", BlogTimeline);
    app.component("BlogTags", BlogTags);
  },
};
