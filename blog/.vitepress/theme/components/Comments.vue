<template>
  <div ref="container" class="utterances-container"></div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";

const { theme, isDark } = useData();
const container = ref<HTMLElement>();
let script: HTMLScriptElement | null = null;

// utterances renders into a shadow root appended next to its <script>, so a
// theme switch requires tearing the instance down and re-inserting it.
function load() {
  if (!container.value) return;
  script?.remove();
  script = null;
  container.value.replaceChildren();

  const cfg = theme.value.utterances ?? {};
  const el = document.createElement("script");
  el.src = "https://utteranc.es/client.js";
  el.async = true;
  el.crossOrigin = "anonymous";
  el.setAttribute("repo", cfg.repo ?? "Forsworns/blog-vitepress");
  el.setAttribute("issue-term", cfg.issueTerm ?? "pathname");
  el.setAttribute("label", cfg.label ?? "Comment");
  el.setAttribute("theme", isDark.value ? "github-dark" : "github-light");

  container.value.appendChild(el);
  script = el;
}

onMounted(load);
watch(isDark, load);
onBeforeUnmount(() => script?.remove());
</script>
