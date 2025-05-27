<template>
  <div class="app-root">
    <AppHeader v-if="!isLoginPage" />
    <div class="main-container" v-if="!isLoginPage">
      <AppSidebar class="sidebar" />
      <div class="content-area">
        <NuxtPage />
      </div>
    </div>
    <NuxtPage v-else />
    <GithubCorner />
  </div>
</template>

<script setup lang="ts">
// 全局引入Element Plus样式
import "element-plus/dist/index.css";
import GithubCorner from "~/components/GithubCorner.vue";
import AppHeader from "~/components/AppHeader.vue";
import AppSidebar from "~/components/AppSidebar.vue";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const isLoginPage = computed(() => route.path === "/login");
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}

.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-container {
  display: flex;
  flex: 1;
  min-height: calc(100vh - 60px); /* Subtract header height */
}

.sidebar {
  flex-shrink: 0;
  z-index: 10;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f7fa;
}
</style>
