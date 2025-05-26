<template>
  <div class="login-page">
    <div class="login-page-header">
      <h1>SQL to API 管理平台</h1>
      <p>基于Node.js和SQLite数据库的SQL转API工具</p>
    </div>

    <div class="login-container">
      <div class="login-wrapper">
        <!-- 左侧介绍区域 -->
        <div class="platform-info">
          <div class="platform-logo">
            <el-icon class="logo-icon"><el-icon-connection /></el-icon>
            <h1>SQL to API</h1>
          </div>
          <div class="platform-description">
            <p class="slogan">将SQL语句转换为API端点，简单快捷</p>
            <div class="features">
              <div class="feature-item">
                <el-icon><el-icon-magic-stick /></el-icon>
                <div class="feature-text">
                  <h3>简单易用</h3>
                  <p>只需编写SQL语句，即可发布REST API</p>
                </div>
              </div>
              <div class="feature-item">
                <el-icon><el-icon-lightning /></el-icon>
                <div class="feature-text">
                  <h3>高性能</h3>
                  <p>基于SQLite内存数据库，快速响应请求</p>
                </div>
              </div>
              <div class="feature-item">
                <el-icon><el-icon-lock /></el-icon>
                <div class="feature-text">
                  <h3>安全可靠</h3>
                  <p>内置SQL注入防护，保障数据安全</p>
                </div>
              </div>
            </div>
          </div>
          <!-- <div class="platform-footer">
            <p>© 2025 SQL to API Platform | Powered by Cloudflare</p>
          </div> -->
        </div>

        <!-- 右侧登录表单 -->
        <div class="login-form-container">
          <el-card class="login-card">
            <template #header>
              <div class="form-header">
                <h2>管理员登录</h2>
                <p>登录后管理您的API端点</p>
              </div>
            </template>
            <el-form
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              label-width="0"
              size="large"
              @submit.prevent="handleLogin"
            >
              <el-form-item prop="username">
                <el-input
                  v-model="loginForm.username"
                  placeholder="用户名"
                  prefix-icon="User"
                />
              </el-form-item>
              <el-form-item prop="password">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="密码"
                  prefix-icon="Lock"
                  show-password
                  @keyup.enter="handleLogin"
                />
              </el-form-item>

              <!-- 人机验证已移除 -->

              <el-form-item>
                <el-button
                  type="primary"
                  class="login-button"
                  :loading="loading"
                  @click="handleLogin"
                >
                  登录
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 添加页脚组件 -->
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import {
  Lock,
  User,
  Connection as ElIconConnection,
  MagicStick as ElIconMagicStick,
  Lightning as ElIconLightning,
  Lock as ElIconLock,
} from "@element-plus/icons-vue";
import AppFooter from "~/components/AppFooter.vue";

// 设置页面标题 (确保只在客户端运行)
onMounted(() => {
  document.title = "SQL to API - 管理员登录";
});

// 禁止未登录用户通过浏览器后退按钮访问历史页面
definePageMeta({
  // 没有添加额外的中间件引用，将由全局中间件处理认证
});

// 表单引用
const loginFormRef = ref();

// 登录表单数据
const loginForm = reactive({
  username: "",
  password: ""
});

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 2, message: "用户名长度至少为2个字符", trigger: "blur" },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度至少为6个字符", trigger: "blur" },
  ],
};

// 加载状态
const loading = ref(false);

// 登录处理函数
const handleLogin = async () => {
  if (!loginFormRef.value) return;

  await loginFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return false;

    // 人机验证已移除

    try {
      loading.value = true;
      const { data, error } = await useFetch("/api/admin/login", {
        method: "POST",
        body: loginForm,
      });

      if (error.value) {
        ElMessage.error(
          "登录失败：" + (error.value?.data?.message || "服务器错误")
        );
        return;
      }

      if (data.value && "success" in data.value && data.value.success) {
        ElMessage.success("登录成功");

        // 登录成功后，验证会话是否真的创建成功
        const { data: verifyResult } = await useFetch(
          "/api/admin/verify-session",
          {
            method: "GET",
            key: `verify-login-${Date.now()}`,
          }
        );

        // 如果服务端会话验证成功，才进行跳转
        if (verifyResult.value?.authenticated) {
          // 跳转逻辑
          setTimeout(async () => {
            console.log("登录成功且会话验证通过，准备重定向...");
            // 重定向到首页
            await navigateTo("/", { replace: true });
          }, 300);
        } else {
          ElMessage.warning("登录处理成功，但会话创建失败，请重试");
        }
      } else {
        const message =
          data.value && "message" in data.value
            ? data.value.message
            : "登录失败，请检查用户名和密码";
        ElMessage.error(message as string);
      }
    } catch (err) {
      console.error("登录出错:", err);
      ElMessage.error("登录过程中发生错误");
    } finally {
      loading.value = false;
      // 人机验证重置逻辑已移除
    }
  });
};

// 扩展Window接口以包含turnstile
declare global {
  interface Window {
    turnstile: any;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.login-page-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-page-header h1 {
  color: #303133;
  font-size: 28px;
  margin-bottom: 10px;
}

.login-page-header p {
  color: #606266;
  font-size: 16px;
}

.login-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-wrapper {
  display: flex;
  width: 1000px;
  max-width: 95%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  overflow: hidden;
  height: 600px;
  background-color: #fff;
}

.platform-info {
  flex: 1;
  background: linear-gradient(135deg, #3a8ffe 0%, #1069e0 100%);
  color: white;
  padding: 40px;
  display: flex;
  flex-direction: column;
}

.platform-logo {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
}

.logo-icon {
  font-size: 36px;
  margin-right: 10px;
}

.platform-logo h1 {
  font-size: 28px;
  margin: 0;
}

.platform-description {
  flex: 1;
}

.slogan {
  font-size: 20px;
  margin-bottom: 40px;
  opacity: 0.9;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
}

.feature-item .el-icon {
  font-size: 24px;
  margin-right: 10px;
  margin-top: 3px;
}

.feature-text h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.feature-text p {
  margin: 0;
  opacity: 0.8;
  font-size: 14px;
}

.platform-footer {
  margin-top: auto;
  opacity: 0.7;
  font-size: 12px;
}

.login-form-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background-color: #ffffff;
}

.login-card {
  width: 100%;
  border: none;
  box-shadow: none;
}

.form-header {
  text-align: center;
  margin-bottom: 10px;
}

.form-header h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.form-header p {
  color: #909399;
  margin: 0;
}

.login-button {
  width: 100%;
  height: 50px;
  margin-top: 10px;
  font-size: 16px;
}

.turnstile-container {
  display: flex;
  justify-content: center;
  margin: 15px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-wrapper {
    flex-direction: column;
    height: auto;
  }

  .platform-info {
    padding: 30px;
  }

  .login-form-container {
    padding: 30px;
  }
}
</style>
