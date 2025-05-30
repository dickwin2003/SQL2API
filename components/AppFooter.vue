<template>
  <el-footer class="app-footer">
    <p>
      © 2025 SQL to API Platform | Powered by
      <a
        href="https://github.com/dickwin2003/SQL2API"
        target="_blank"
        class="github-link"
      >
        <el-icon class="github-icon"><Promotion /></el-icon>
        SQL2API
      </a>
    </p>
  </el-footer>
</template>

<script setup lang="ts">
import { Promotion } from "@element-plus/icons-vue";
</script>

<style scoped>
.app-footer {
  text-align: center;
  color: #909399;
  padding: 20px 0;
  border-top: 1px solid #ebeef5;
  margin-top: auto;
  background-color: transparent;
}

.github-link {
  color: #409eff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: color 0.3s;
}

.github-link:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.github-icon {
  margin-right: 4px;
}
</style>
