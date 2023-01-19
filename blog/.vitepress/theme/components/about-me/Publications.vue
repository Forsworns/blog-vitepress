<template>
  <p v-for="(item, idx) in papers" :key="idx">[{{ idx + 1 }}] {{ item }}</p>
</template>


<script lang="ts" setup>

const _ = defineProps<{
  lang: 'cn' | 'en'
}>();

const papers = [
  "P. Yang, J. Lei, L. Kong, C. Xu, P. Zeng, E. Khorov. “Policy Learning based Cognitive Radio for Unlicensed Cellular Communication”. IEEE GLOBECOM, Rio de Janeiro, Brazil, 2022.",
  "G. Sibul, P. Yang, D. Muravev, J. Jin, L. Kong. “Revealing the true navigability of the Northern Sea Route from ice conditions and weather observations”. Maritime Policy & Management (MPM). 2022.",
  "P. Yang, L. Kong, G. Chen. “Spectrum sharing for 5G/6G URLLC: Research frontiers and standards”. IEEE Communications Standards Magazine (ComSoC), 2022.",
  "P. Yang, L. Kong, M. Qiu, X. Liu, G. Chen. “Compressed Imaging Reconstruction with Sparse Random Projection”. ACM Transactions on Multimedia Computing Communications and Applications (TOMM), 2021.",
  "P. Yang, L. Kong, X.-Y. Liu, X. Yuan, G. Chen. “Shearlet Enhanced Snapshot Compressive Imaging”. IEEE Transactions on Image Processing (TIP), Vol. 29, pp. 6466-6481, 2020.",
  "P. Yang, L. Kong, G. Chen, J. Shi, G. Zeng. “Cloud based Sparse Random Projection for Compressed Imaging”. IEEE SmartCloud, Tokyo, Japan, 2019. (Best Paper Award)",
];

</script>