<template>
  <div v-if="props.lang === 'cn'">
    <p>
      目前在做 GPU 虚拟化等工作，从前从事过网络、AI 相关研究，啥都懂一点 :)
    </p>
    <p>
      <i class="icon ion-briefcase"></i> 阿里云智能 基础软件部 GPU 虚拟化 (23-)。
    </p>
    <p>
      <i class="icon ion-university"></i> 上海交通大学 计算机科学与工程系
      硕士研究生在读 (20-23)。
    </p>
    <p>
      <i class="icon ion-briefcase"></i> 阿里云智能 基础软件部 实习生 容器网络 (22)。
    </p>
    <p>
      <i class="icon ion-briefcase"></i> 字节跳动 产品研发和工程架构部 实习生 DPDK驱动 (22)。
    </p>
    <p>
      <i class="icon ion-briefcase"></i> 北京大学高等信息研究院 泛在操作系统组 实习生 物联网操作系统 (21-22)。
    </p>
    <p>
      <i class="icon ion-briefcase"></i> 英特尔亚太研发中心 数据中心组 实习生 英特尔平台高可靠特性 (19-20)。
    </p>
    <p>
      <i class="icon ion-university"></i> 上海交通大学 计算机科学与工程系
      工学学士 (16-20)。
    </p>
    <p>
      <i class="icon ion-university"></i> 上海交通大学 安泰经济与管理学院
      第二学科经济学学士 (16-20)。
    </p>
  </div>
  <div v-else>
    <p>
      Currently work on GPU virtualization. Previously engaged in Network and AI. Hungry and Humble :)
    </p>
    <p>
      <i class="icon ion-university"></i> Shanghai Jiao Tong University,
      Department of Computer Science and Engineering, Pursing MA.SC. (20-).
    </p>
    <p>
      <i class="icon ion-briefcase"></i> Alibaba Cloud, Infrastructure, Intern, Container Networking (22).
    </p>
    <p>
      <i class="icon ion-briefcase"></i> ByteDance, Infrastructure, Intern, DPDK Driver (22).
    </p>
    <p>
      <i class="icon ion-briefcase"></i> PKU Advanced Institute of Information Technology, Ubiquitous OS Group,
      Intern, IoT OS (21-22).
    </p>
    <p>
      <i class="icon ion-briefcase"></i> Intel, Data Center Platform Application Engineering Intern,
      Reliability/Availability/Serviceability (19-20).
    </p>
    <p>
      <i class="icon ion-university"></i> Shanghai Jiao Tong University,
      Department of Computer Science and Engineering, BEng. (16-20).
    </p>
    <p>
      <i class="icon ion-university"></i> Shanghai Jiao Tong University, Antai
      College of Economics & Management, Second Major. (16-20).
    </p>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  lang: 'cn' | 'en'
}>();

</script>
