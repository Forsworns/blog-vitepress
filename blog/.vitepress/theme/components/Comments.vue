<template>
  <div id="gitalk-container"></div>
</template>
<script lang="ts" setup>
import "gitalk/dist/gitalk.css";
import Gitalk from "gitalk";
import { onMounted } from "vue";
import { useData } from "vitepress";

const { theme } = useData();

const lang = location.href.includes('/zh/') ? 'zh-CN' : 'en';

const gitalk = new Gitalk({
  ...theme.value.gitalk,
  id: location.pathname.substring(0, 50), // Ensure uniqueness and length less than 50
  language: lang,
  distractionFreeMode: true, // Facebook-like distraction free mode
});

onMounted(() => {
  gitalk.render("gitalk-container");
});
</script>
<style scoped>

</style>

