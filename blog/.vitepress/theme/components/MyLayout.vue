<template>
  <Layout>
    <template #doc-after>
      <Comments />
    </template>
    <!-- Home slot-->
    <template #home-hero-before>
      <HomeHero />
    </template>
    <template #home-features-after>
      <BlogLatest />
    </template>
  </Layout>
  <BackToTop />
  <!-- copywright -->
  <CopyWright />
</template>
<script lang="ts" setup>
import DefaultTheme from "vitepress/theme";
// insert these components into the slots of the `DefaultTheme`
import HomeHero from "./HomeHero.vue";
import CopyWright from "./CopyWright.vue";
import Comments from "./Comments.vue";
import BlogLatest from "./blogs/BlogLatest.vue";
import BackToTop from "./BackToTop.vue";
const { Layout } = DefaultTheme;
</script>
<style scoped>

</style>
