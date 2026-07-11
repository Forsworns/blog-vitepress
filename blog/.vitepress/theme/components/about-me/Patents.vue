<template>
    <p v-for="(item, idx) in patents" :key="idx">[{{ idx + 1 }}] {{ item }}</p>
</template>
  
  
<script lang="ts" setup>

const _ = defineProps<{
    lang: 'cn' | 'en'
}>();

const patents = [
    "“基于BPF的片上异构多处理器系统任务调度系统及方法”, CN119045959A, 2026",
    "“AI应用异常检测方法、电子设备、存储介质及程序产品”, CN119576749A, 第一发明人, 2025",
    "“代码逆向分析方法、系统、电子设备、介质和产品”, CN118778971A, 第一发明人，2024",
    "“数据处理方法、装置及设备”, CN118132273A, 第一发明人，2024",
    "“基于GPU的用户容器处理方法、装置、设备及介质”, CN118426912A, 2024",
];

</script>
  
