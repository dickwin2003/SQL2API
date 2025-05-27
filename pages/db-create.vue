<template>
  <div class="db-create">
    <el-page-header @back="$router.go(-1)" title="返回" content="新建数据库连接" />

    <div class="create-content">
      <el-card class="form-card">
        <template #header>
          <div class="card-header">
            <span>数据库连接信息</span>
          </div>
        </template>

        <el-form
          :model="connectionForm"
          :rules="connectionRules"
          ref="connectionFormRef"
          label-width="120px"
          label-position="left"
        >
          <el-form-item label="连接名称" prop="name">
            <el-input v-model="connectionForm.name" placeholder="请输入连接名称" />
          </el-form-item>
          <el-form-item label="主机地址" prop="host">
            <el-input v-model="connectionForm.host" placeholder="例如: localhost, 192.168.1.100" />
          </el-form-item>
          <el-form-item label="端口" prop="port">
            <el-input-number v-model="connectionForm.port" :min="1" :max="65535" style="width: 180px;" />
          </el-form-item>
          <el-form-item label="用户名" prop="username">
            <el-input v-model="connectionForm.username" placeholder="数据库用户名" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="connectionForm.password"
              type="password"
              placeholder="数据库密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="数据库名称/服务" prop="database_name">
            <el-input
              v-model="connectionForm.database_name"
              placeholder="数据库名称，Oracle则填写服务名"
            />
          </el-form-item>
          <el-form-item label="数据库类型" prop="db_type">
            <el-select v-model="connectionForm.db_type" placeholder="选择数据库类型" style="width: 180px;">
              <el-option label="MySQL" value="mysql" />
              <el-option label="PostgreSQL" value="postgresql" />
              <el-option label="SQL Server" value="sqlserver" />
              <el-option label="Oracle" value="oracle" />
              <el-option label="SQLite" value="sqlite" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-switch
              v-model="connectionForm.is_active"
              active-text="激活"
              inactive-text="禁用"
            />
          </el-form-item>
          <el-form-item label="连接字符串" prop="connection_string">
            <el-input
              v-model="connectionForm.connection_string"
              type="textarea"
              placeholder="可选，特殊配置的连接字符串"
            />
          </el-form-item>
          <el-form-item label="备注" prop="notes">
            <el-input
              v-model="connectionForm.notes"
              type="textarea"
              placeholder="可选，备注信息"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="submitConnectionForm" :loading="submitting">
              保存
            </el-button>
            <el-button type="success" @click="testConnectionFromForm" :loading="testing">
              测试连接
            </el-button>
            <el-button @click="$router.push('/db-connections')">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 测试连接结果对话框 -->
    <el-dialog v-model="testResultVisible" title="测试连接结果" width="400px">
      <div v-if="testResult" class="test-result-container">
        <el-result
          :icon="testResult.success ? 'success' : 'error'"
          :title="testResult.success ? '连接成功' : '连接失败'"
          :sub-title="testResult.message"
        >
          <template #extra>
            <el-button type="primary" @click="testResultVisible = false">确定</el-button>
          </template>
        </el-result>
        <div v-if="testResult.details" class="test-details">
          <el-collapse>
            <el-collapse-item title="详细信息">
              <pre>{{ testResult.details }}</pre>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </el-dialog>

    <!-- 添加页脚组件 -->
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();

// 连接表单
const connectionFormRef = ref(null);
const connectionForm = reactive({
  name: '',
  host: '',
  port: 3306,
  username: '',
  password: '',
  database_name: '',
  db_type: 'mysql',
  is_active: true,
  connection_string: '',
  notes: ''
});

// 表单验证规则
const connectionRules = {
  name: [
    { required: true, message: '请输入连接名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口号必须在1-65535之间', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  database_name: [
    { required: true, message: '请输入数据库名称', trigger: 'blur' }
  ],
  db_type: [
    { required: true, message: '请选择数据库类型', trigger: 'change' }
  ]
};

// 状态控制
const submitting = ref(false);
const testing = ref(false);
const testResultVisible = ref(false);
const testResult = ref(null);

// 从表单测试连接
async function testConnectionFromForm() {
  if (!connectionFormRef.value) return;
  
  await connectionFormRef.value.validate(async (valid) => {
    if (!valid) return;
    
    testing.value = true;
    
    try {
      const formData = { ...connectionForm };
      
      const response = await fetch('/api/admin/db-connections/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      testResult.value = {
        success: data.success,
        message: data.message,
        details: data.details
      };
      
      testResultVisible.value = true;
    } catch (error) {
      console.error('测试连接出错:', error);
      testResult.value = {
        success: false,
        message: '测试连接请求失败',
        details: error.toString()
      };
      testResultVisible.value = true;
    } finally {
      testing.value = false;
    }
  });
}

// 提交连接表单
async function submitConnectionForm() {
  if (!connectionFormRef.value) return;
  
  await connectionFormRef.value.validate(async (valid) => {
    if (!valid) return;
    
    submitting.value = true;
    
    try {
      const formData = { ...connectionForm };
      
      const response = await fetch('/api/admin/db-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        ElMessage.success('数据库连接创建成功');
        router.push('/db-connections');
      } else {
        ElMessage.error(data.message || '添加连接失败');
      }
    } catch (error) {
      console.error('添加连接出错:', error);
      ElMessage.error('添加连接失败');
    } finally {
      submitting.value = false;
    }
  });
}
</script>

<style scoped>
.db-create {
  padding: 20px;
}

.create-content {
  margin-top: 20px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.form-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-result-container {
  text-align: center;
}

.test-details {
  margin-top: 10px;
  text-align: left;
}

.test-details pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  color: #606266;
}
</style>
