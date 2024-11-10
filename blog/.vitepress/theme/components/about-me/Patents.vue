<template>
    <p v-for="(item, idx) in patents" :key="idx">[{{ idx + 1 }}] {{ item }}</p>
</template>
  
  
<script lang="ts" setup>

const _ = defineProps<{
    lang: 'cn' | 'en'
}>();

const patents = [
    "“代码逆向分析方法、系统、电子设备、介质和产品”, CN118778971, 第一发明人，2024",
    "“数据处理方法、装置及设备”, CN118132273, 第一发明人，2024",
    "“基于GPU的用户容器处理方法、装置、设备及介质”, CN118426912, 2024",
];

</script>
  