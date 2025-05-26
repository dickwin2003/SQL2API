<template>
  <div class="app-container">
    <div class="main-content">
      <el-container>
        <el-aside width="200px">
          <!-- <div class="menu-header">
            <h3>管理系统</h3>
          </div> -->
          <el-menu default-active="/" class="el-menu-vertical" router>
            <el-menu-item index="/">
              <el-icon><el-icon-house /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/create-api">
              <el-icon><el-icon-plus /></el-icon>
              <span>创建API</span>
            </el-menu-item>
            <el-menu-item index="/api-list">
              <el-icon><el-icon-menu /></el-icon>
              <span>API列表</span>
            </el-menu-item>
            <el-menu-item index="/api-logs">
              <el-icon><el-icon-data-analysis /></el-icon>
              <span>API日志</span>
            </el-menu-item>
            <el-menu-item index="/api-tester">
              <el-icon><el-icon-tickets /></el-icon>
              <span>API测试</span>
            </el-menu-item>
            <el-menu-item index="/docs">
              <el-icon><el-icon-document /></el-icon>
              <span>使用文档</span>
            </el-menu-item>
            <el-divider />
            <el-menu-item @click="handleLogout">
              <el-icon><el-icon-switch-button /></el-icon>
              <span>退出登录</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        <el-container>
          <el-main>
            <el-card>
              <template #header>
                <div class="card-header">
                  <h3>欢迎使用SQL to API平台</h3>
                </div>
              </template>
              <div class="welcome-content">
                <p>
                  这是一个基于Node.js和SQLite数据库的SQL到API转换平台。
                </p>
                <p>您可以通过简单地编写SQL查询，快速创建REST API端点。</p>

                <el-divider>功能特点</el-divider>

                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-card class="feature-card">
                      <el-icon class="feature-icon"
                        ><el-icon-magic-stick
                      /></el-icon>
                      <h4>简单易用</h4>
                      <p>只需编写SQL语句，即可发布REST API</p>
                    </el-card>
                  </el-col>
                  <el-col :span="8">
                    <el-card class="feature-card">
                      <el-icon class="feature-icon"
                        ><el-icon-lightning
                      /></el-icon>
                      <h4>高性能</h4>
                      <p>基于Cloudflare全球网络，快速响应请求</p>
                    </el-card>
                  </el-col>
                  <el-col :span="8">
                    <el-card class="feature-card">
                      <el-icon class="feature-icon"><el-icon-lock /></el-icon>
                      <h4>安全可靠</h4>
                      <p>内置SQL注入防护，保障数据安全</p>
                    </el-card>
                  </el-col>
                </el-row>

                <el-divider>开始使用</el-divider>

                <el-button type="primary" @click="$router.push('/create-api')">
                  开始创建API
                </el-button>
              </div>
            </el-card>
          </el-main>
        </el-container>
      </el-container>
    </div>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import {
  House as ElIconHouse,
  Connection as ElIconConnection,
  Tickets as ElIconTickets,
  MagicStick as ElIconMagicStick,
  Lightning as ElIconLightning,
  Lock as ElIconLock,
  Document as ElIconDocument,
  Plus as ElIconPlus,
  Menu as ElIconMenu,
  DataAnalysis as ElIconDataAnalysis,
  SwitchButton as ElIconSwitchButton,
} from "@element-plus/icons-vue";
import AppFooter from "~/components/AppFooter.vue";
import { onMounted } from "vue";

// 设置页面标题 (确保只在客户端运行)
onMounted(() => {
  document.title = "SQL to API - 首页";
});

// 处理退出登录
const handleLogout = async () => {
  try {
    const { data, error } = await useFetch("/api/admin/logout", {
      method: "POST",
    });

    if (error.value) {
      ElMessage.error(
        "退出登录失败：" + (error.value?.data?.message || "服务器错误")
      );
      return;
    }

    if (data.value && "success" in data.value && data.value.success) {
      ElMessage.success("退出登录成功");

      // 退出后立即重定向到登录页，不需要额外验证
      // 因为退出登录API已经清除了会话
      setTimeout(async () => {
        console.log("退出登录成功，准备重定向...");
        // 重定向到登录页
        await navigateTo("/login", { replace: true });
      }, 300);
    } else {
      const message =
        data.value && "message" in data.value
          ? data.value.message
          : "退出登录失败，请稍后再试";
      ElMessage.error(message as string);
    }
  } catch (err) {
    console.error("退出登录出错:", err);
    ElMessage.error("退出登录过程中发生错误");
  }
};
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
}

.el-container {
  height: 100%;
  width: 100%;
}

.el-aside {
  background-color: #f5f7fa;
  color: #333;
  border-right: 1px solid #dcdfe6;
}

.menu-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #303133;
  border-bottom: 1px solid #dcdfe6;
}

.el-menu-vertical {
  height: calc(100% - 60px);
  border-right: none;
}

.el-card {
  margin-bottom: 20px;
}

.feature-card {
  text-align: center;
  height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.feature-icon {
  font-size: 30px;
  color: #409eff;
  margin-bottom: 10px;
}

.welcome-content {
  text-align: center;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
