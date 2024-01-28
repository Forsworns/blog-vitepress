<template>
  <p v-for="(item, idx) in honors" :key="idx">
    <b>&sdot;</b>
    {{ item }}
  </p>
</template>


<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{
  lang: 'cn' | 'en'
}>();

const data = {
  cn: {
    honors: [
      "上海市优秀毕业生, 2023。",
      "博世中国AIoT奖学金、鹰角奖学金, 2022。",
      "上海交通大学优秀毕业生, 2020。",
      "杨元庆教育基金优秀本科生卓越奖学金（授予上海交通大学电子信息与电气工程学院约1%的本科生）, 2020年。",
      "IEEE SmartCloud会议最佳论文奖，2019。",
      "美国大学生数学建模竞赛Meritorious Winner/Honorable Mention（授予全球前7%/15%的参赛队伍）, 2018/2019年。",
      "全国高校云计算应用创新大赛全国三等奖（授予全国前2.5%-5%的参赛队伍）, 2018年。",
    ],
  },
  en: {
    honors: [
      "Shanghai Excellent Graduates, 2023.",
      "BOSCH AIoT Scholarship、HyperGryph Scholarship, 2022.",
      "SJTU Excellent Graduates, 2020.",
      "Yang Yuanqing Education Fund Outstanding Undergraduate Award, 2020. Awarded to ~1% students in SJTU SEIEE.",
      "IEEE SmartCloud Best Paper Award, 2019.",
      "Mathematical Contest in Modelling, Meritorious Winner/Honorable Mention, 2018/2019. Awarded to top 7%/15% participants from all over the world.",
      "National Colleges Cloud Computation Application and Innovation, National Third Price, 2018. Awarded to top 2.5% to 5% teams in the national contest.",
    ],
  },
};

const honors = computed(() => data[props.lang].honors);

</script>