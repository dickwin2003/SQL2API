<template>
  <div class="app-sidebar">
    <el-menu
      :default-active="activeRoute"
      class="sidebar-menu"
      :router="true"
      :collapse="isCollapse"
      :default-openeds="['/db', '/api']"
    >
      <div class="logo-container">
        <h3 v-if="!isCollapse">SQL2API</h3>
        <el-icon v-else><Connection /></el-icon>
      </div>
      
      <el-menu-item index="/">
        <el-icon><HomeFilled /></el-icon>
        <template #title>首页</template>
      </el-menu-item>
      
      <el-sub-menu index="/db">
        <template #title>
          <el-icon><DataLine /></el-icon>
          <span>数据库管理</span>
        </template>
        <el-menu-item index="/db-connections">连接管理</el-menu-item>
        <el-menu-item index="/table-management">表管理</el-menu-item>
        <!--<el-menu-item index="/table-list">自定义表</el-menu-item>-->
      </el-sub-menu>
      
      <el-sub-menu index="/api">
        <template #title>
          <el-icon><Document /></el-icon>
          <span>API管理</span>
        </template>
        <el-menu-item index="/api-list">API列表</el-menu-item>
        <el-menu-item index="/api-tester">API测试</el-menu-item>
        <el-menu-item index="/api-logs">API日志</el-menu-item>
      </el-sub-menu>
      
      <el-menu-item index="/docs">
        <el-icon><Reading /></el-icon>
        <template #title>文档</template>
      </el-menu-item>
      
      <div class="sidebar-footer">
        <el-button 
          :icon="isCollapse ? 'el-icon-d-arrow-right' : 'el-icon-d-arrow-left'"
          circle
          @click="toggleCollapse"
          class="collapse-btn"
        >
          <el-icon v-if="isCollapse"><DArrowRight /></el-icon>
          <el-icon v-else><DArrowLeft /></el-icon>
        </el-button>
      </div>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { 
  HomeFilled, 
  Document, 
  DataLine, 
  Reading, 
  Connection,
  DArrowLeft,
  DArrowRight
} from '@element-plus/icons-vue';

const route = useRoute();
const isCollapse = ref(false);

// 获取当前路由路径
const activeRoute = computed(() => {
  return route.path;
});

// 切换侧边栏折叠状态
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};
</script>

<style scoped>
.app-sidebar {
  height: 100%;
  position: relative;
}

.sidebar-menu {
  height: 100vh;
  border-right: solid 1px #e6e6e6;
  width: auto;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 200px;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #e6e6e6;
}

.logo-container h3 {
  margin: 0;
  color: #409EFF;
}

.sidebar-footer {
  position: absolute;
  bottom: 20px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.collapse-btn {
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
