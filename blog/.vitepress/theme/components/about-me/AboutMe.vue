<template>
  <div class="main">
    <el-row :align="'middle'" justify="center">
      <el-col :span="8">
        <img src="/assets/selfie_cartoon.jpg" class="avatar" />
      </el-col>
      <el-col :span="16">
        <el-row>
          <el-col :span="6">{{ nameL }}</el-col>
          <el-col :span="18">{{ name }}</el-col>
        </el-row>

        <el-row>
          <el-col :span="6">{{ cityL }}</el-col>
          <el-col :span="18">{{ city }}</el-col>
        </el-row>

        <el-row>
          <el-col :span="6">{{ mailL }}</el-col>
          <el-col :span="18">{{ mail }}</el-col>
        </el-row>

        <el-row>
          <el-col :span="24">
            <a :href="cvRoute">{{ cv }}</a>
          </el-col>
        </el-row>
      </el-col>
    </el-row>

    <el-row>
      <el-col>
        <el-tabs v-model="activeTab" id="custom-tabs">
          <el-tab-pane v-for="(item, idx) in labels" :key="item">
            <template #label>
              <span :style="tabLableCss">
                <i class="icon" :class="icons[idx]"></i>
                {{ item }}
              </span>
            </template>
            <component :is="component" :lang="props.lang"></component>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>
    <Mottos :lang="props.lang" />
  </div>
</template>

<script lang="ts" setup>
import Information from "./Information.vue";
import Honors from "./Honors.vue";
import Publications from "./Publications.vue";
import Interests from "./Interests.vue";
import Mottos from "./Mottos.vue";

import { ref, computed, Ref } from "vue";

const tabLableCss = {
  color: "var(--vp-c-text)",
};

const props = defineProps<{
  lang: 'cn' | 'en'
}>();

const components: { [index: string]: any } = [Information, Honors, Publications, Interests];

let activeTab: Ref<string> = ref('0');

const icons = [
  "ion-person-add",
  "ion-ribbon-a",
  "ion-folder",
  "ion-heart",
];

const data = {
  cn: {
    nameL: "姓名：",
    name: "杨培灏",
    cityL: "居住地：",
    city: "上海",
    mailL: "邮箱",
    mail: "peihao DOT young AT gmail DOT com",
    cv: "我的简历",
    cvRoute: "/cv_cn.pdf",
    labels: [
      "个人信息",
      "奖项列表",
      "论文列表",
      "兴趣爱好",
    ],
  },
  en: {
    nameL: "Name:",
    name: "Peihao Yang",
    cityL: "Location:",
    city: "Shanghai, China",
    mailL: "Mail:",
    mail: "peihao DOT young AT gmail DOT com",
    cv: "My Curriculum Vitae",
    cvRoute: "/cv_en.pdf",
    labels: [
      "Information",
      "Honors",
      "Publications",
      "Interests",
    ],
  }
};

const component = computed(() => components[activeTab.value]);
const name = computed(() => data[props.lang].name);
const city = computed(() => data[props.lang].city);
const mail = computed(() => data[props.lang].mail);
const nameL = computed(() => data[props.lang].nameL);
const cityL = computed(() => data[props.lang].cityL);
const mailL = computed(() => data[props.lang].mailL);
const cv = computed(() => data[props.lang].cv);
const cvRoute = computed(() => data[props.lang].cvRoute);
const labels = computed(() => data[props.lang].labels);
</script>
  
<style scoped>
.main {
  margin: 0 auto;
  padding: 0.5rem 1.5rem 4rem;
  max-width: 48rem;
}

.icon {
  font-size: 15px;
}

.avatar {
  width: 100px;
  height: 100px;
}

a {
  color: var(--vp-c-brand);
  font-weight: bold;
}

a:hover {
  text-decoration: none;
  color: var(--vp-c-hover);
}
</style>

<style>
p {
  margin: 12px;
}
</style>