<template>
  <div>
    <el-timeline v-for="(blog, idx) in props.blogs" :key="idx">
      <el-timeline-item :timestamp="blog.date" placement="top">
        <el-card shadow="hover" :body-style="cardCss">
          <a :href=blog.href>
            <h4>{{ blog.frontMatter.title }}</h4>
          </a>
          <p>{{ blog.frontMatter.description }}</p>
        </el-card>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script lang="ts" setup>
import { type Blog } from "../../utils"

const cardCss = {
  background: 'var(--vp-c-bg)',
  'overflow-y': 'auto',
  'color': 'var(--vp-c-text)',
};

const props = defineProps({
  blogs: {
    type: Array<Blog>,
    required: true,
  }
});
</script>

<style scoped>
a {
  color: var(--vp-c-brand);
  font-weight: bold;
}

a:hover {
  text-decoration: none;
  color: var(--vp-c-hover);
}
</style>