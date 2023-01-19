<template>
  <div>
    <p>
      {{ description }}
    </p>
    <p>
      <el-row justify="center">
        <img src="/assets/selfie_ff14.png" class="selfie" alt="" />
      </el-row>
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{
  lang: 'cn' | 'en'
}>();

const data = {
  cn: {
    description: `
          业余时间我是一名拉拉肥，你可以在最终幻想14国服陆行鸟大区找到我 :) 
        `,
  },
  en: {
    description: `
          In my spare time, I am a Lalafell in Final Fantasy XIV. Thank you, Yoshi-P!
        `,
  },
};

const description = computed(() => data[props.lang].description);
</script>


<style scoped>
div {
  text-align: center;
}

.selfie {
  width: 60%;
  height: 60%;
}
</style>