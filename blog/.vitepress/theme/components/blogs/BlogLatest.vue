<template>
  <div class="main">
    <Timeline :blogs="blogs"></Timeline>
  </div>
</template>

<script lang="ts" setup>
import Timeline from "./Timeline.vue";
import { useData } from "vitepress";

const { theme } = useData();
let blogs = theme.value.blogs.slice(0, 2);

</script>

<style scoped>
.main {
  margin: 0 auto;
  padding: 0.5rem 1.5rem;
  max-width: 48rem;
}
</style>
