<template>
  <div class="main">
    <el-row id="checker">
      <el-row id="checkbox">
        <el-checkbox-group v-model="selectedTagsArray" @change="handleCheck" size="small">
          <el-checkbox-button v-for="tag in allTags" :label="tag" :key="tag">{{ tag }}</el-checkbox-button>
        </el-checkbox-group>
      </el-row>
      <el-row id="tags">
        <el-tag v-for="tag in selectedTags" :key="tag" closable :disable-transitions="false" type="success"
          effect="light" @close="handleClose(tag)">
          {{ tag }}
        </el-tag>
        <el-input class="input-new-tag" v-if="inputVisible" v-model="inputValue" ref="saveTagInput" size="small"
          @keyup.enter.native="handleInputConfirm" @blur="handleInputConfirm">
        </el-input>
        <el-button v-else class="button-new-tag" size="small" @click="showInput">+ 标签</el-button>
      </el-row>
    </el-row>

    <Timeline :blogs="filteredBlogs"></Timeline>
  </div>
</template>

<script lang="ts" setup>
import Timeline from "./Timeline.vue";
import { useData } from "vitepress";
import { ref, type Ref, nextTick, reactive } from "vue"
import { type Blog } from "../../utils"

let { theme } = useData();

let blogs: Array<Blog> = theme.value.blogs;
let allTags: Set<string> = reactive(new Set());
let selectedTagsArray: Ref<Array<string>> = ref([]);
let selectedTags: Ref<Set<string>> = ref(new Set([]));
let filteredBlogs: Ref<Array<Blog>> = ref([]);
let inputVisible: Ref<boolean> = ref(false);
let inputValue: Ref<string> = ref("");
let saveTagInput = ref();

blogs.forEach((blog: Blog) => {
  blog.frontMatter.tags?.forEach((tag) => allTags.add(tag));
});

// methods
let handleCheck = () => {
  selectedTags.value = new Set(selectedTagsArray.value);
  updateBlogs();
};
let handleClose = (tag: string) => {
  if (selectedTags.value.has(tag)) {
    selectedTags.value.delete(tag);
    selectedTagsArray.value.splice(selectedTagsArray.value.indexOf(tag), 1);
  }
  updateBlogs();
};
let showInput = () => {
  inputVisible.value = true;
  nextTick(() => {
    saveTagInput.value.input.focus();
  });
};
let handleInputConfirm = () => {
  let tag = inputValue;
  if (tag.value.length > 0 && !selectedTags.value.has(tag.value)) {
    selectedTags.value.add(tag.value);
    selectedTagsArray.value.push(tag.value);
  }
  inputVisible.value = false;
  inputValue.value = "";
  updateBlogs();
};
let updateBlogs = () => {
  filteredBlogs.value = blogs.filter((blog) => {
    // check if intersection exist between selected tags and blog tags
    let intersect = blog.frontMatter.tags?.filter((tag) => selectedTags.value.has(tag));
    return intersect?.length === undefined ? false : intersect?.length > 0;
  })
};
</script>

<style scoped>
.main {
  margin: 0 auto;
  padding: 0.5rem 1.5rem 4rem;
  max-width: 48rem;
}

.el-tag+.el-tag {
  margin-left: 10px;
}

.button-new-tag {
  margin-left: 10px;
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}

.input-new-tag {
  width: 90px;
  margin-left: 10px;
  vertical-align: bottom;
}

#checker {
  margin-bottom: 30px;
}

#checkbox {
  margin-bottom: 10px;
}
</style>
