<template>
  <div class="app-root">
    <ClientOnly>
      <AppHeader v-if="!isLoginPage" />
      <div class="main-container" v-if="!isLoginPage">
        <AppSidebar class="sidebar" />
        <div class="content-area">
          <NuxtPage />
        </div>
      </div>
      <NuxtPage v-else />
      <GithubCorner />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";
import "element-plus/dist/index.css";

// Define components with proper type checking
const GithubCorner = defineAsyncComponent(() => import("~/components/GithubCorner.vue"));
const AppHeader = defineAsyncComponent(() => import("~/components/AppHeader.vue"));
const AppSidebar = defineAsyncComponent(() => import("~/components/AppSidebar.vue"));

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
