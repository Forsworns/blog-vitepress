<template>
  <div class="pic"></div>
</template>
<script lang="ts" setup>
import { onMounted } from "vue";
import { useData, withBase } from "vitepress";
import { attachLottie } from "../utils";

const { theme } = useData();
const path = withBase(theme.value.homeLottie);

onMounted(() => {
  attachLottie("homeLottie", path, "300px");
});
</script>
<style scoped>
.pic {
  text-align: center;
  height: 300px;
}
</style>
