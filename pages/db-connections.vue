<template>
  <div class="db-connections">
    <el-page-header @back="$router.go(-1)" title="返回" content="数据库连接管理" />

    <div class="connections-content">
      <div class="connections-actions">
        <el-row :gutter="20">
          <el-col :span="16">
            <el-button
              type="primary"
              @click="fetchConnections"
              :icon="Refresh"
              size="small"
            >
              刷新
            </el-button>

            <el-button
              type="success"
              @click="$router.push('/db-create')"
              :icon="Plus"
              size="small"
            >
              添加连接
            </el-button>

            <div class="batch-actions-inline" v-if="selectedConnections.length > 0">
              <el-divider direction="vertical" />
              <span class="selected-info">
                已选择 {{ selectedConnections.length }} 个连接
              </span>
              <el-button
                type="success"
                @click="batchUpdateConnectionStatus(true)"
                size="small"
                :disabled="selectedConnections.length === 0"
              >
                设为激活
              </el-button>
              <el-button
                type="warning"
                @click="batchUpdateConnectionStatus(false)"
                size="small"
                :disabled="selectedConnections.length === 0"
              >
                设为禁用
              </el-button>
              <el-button
                type="danger"
                @click="batchDeleteConnections"
                size="small"
                :disabled="selectedConnections.length === 0"
              >
                批量删除
              </el-button>
            </div>
          </el-col>
          <el-col :span="8">
            <el-select
              v-model="selectedDbType"
              clearable
              placeholder="按数据库类型筛选"
              @change="handleDbTypeChange"
              style="width: 100%"
            >
              <el-option label="全部类型" :value="null" />
              <el-option
                v-for="dbType in dbTypes"
                :key="dbType"
                :label="getDbTypeName(dbType)"
                :value="dbType"
              >
                <div class="db-type-option">
                  <span>{{ getDbTypeName(dbType) }}</span>
                  <el-tag size="small" :type="getDbTypeTagType(dbType)">
                    {{ dbType }}
                  </el-tag>
                </div>
              </el-option>
            </el-select>
          </el-col>
        </el-row>
      </div>

      <!-- 数据库连接列表 -->
      <el-table
        :data="connectionsList"
        style="width: 100%; margin-top: 20px"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="连接名称" />
        <el-table-column prop="host" label="主机地址" />
        <el-table-column prop="port" label="端口" width="80" />
        <el-table-column prop="database_name" label="数据库名称/服务" />
        <el-table-column prop="db_type" label="数据库类型" width="120">
          <template #default="scope">
            <el-tag :type="getDbTypeTagType(scope.row.db_type)">
              {{ getDbTypeName(scope.row.db_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.is_active ? 'success' : 'info'">
              {{ scope.row.is_active ? "激活" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="460">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="viewConnectionDetails(scope.row)"
            >
              详情
            </el-button>
            <el-button
              type="success"
              size="small"
              @click="testConnection(scope.row)"
            >
              测试连接
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="viewTables(scope.row.id)"
            >
              查看表
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="editConnection(scope.row)"
              :icon="Edit"
              :loading="loadingEditId === scope.row.id"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteConnection(scope.row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="connectionsTotal"
          :page-size="pageSize"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <!-- 连接详情对话框 -->
    <el-dialog v-model="detailsVisible" title="连接详情" width="70%">
      <div v-if="selectedConnection">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="连接名称">{{
            selectedConnection.name
          }}</el-descriptions-item>
          <el-descriptions-item label="主机地址">{{
            selectedConnection.host
          }}</el-descriptions-item>
          <el-descriptions-item label="端口">{{
            selectedConnection.port
          }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{
            selectedConnection.username
          }}</el-descriptions-item>
          <el-descriptions-item label="密码">
            ******** (已隐藏)
          </el-descriptions-item>
          <el-descriptions-item label="数据库名称/服务">{{
            selectedConnection.database_name
          }}</el-descriptions-item>
          <el-descriptions-item label="数据库类型">
            <el-tag :type="getDbTypeTagType(selectedConnection.db_type)">
              {{ getDbTypeName(selectedConnection.db_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ selectedConnection.is_active ? "激活" : "禁用" }}
          </el-descriptions-item>
          <el-descriptions-item label="连接字符串" v-if="selectedConnection.connection_string">
            {{ selectedConnection.connection_string }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" v-if="selectedConnection.notes">
            {{ selectedConnection.notes }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ new Date(selectedConnection.created_at).toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="最后连接时间" v-if="selectedConnection.last_connected_at">
            {{ new Date(selectedConnection.last_connected_at).toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="连接状态" v-if="selectedConnection.connection_status">
            <el-tag :type="selectedConnection.connection_status === 'success' ? 'success' : 'danger'">
              {{ selectedConnection.connection_status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 添加/编辑连接对话框 -->
    <el-dialog
      v-model="connectionFormVisible"
      :title="isEditing ? '编辑连接' : '添加连接'"
      width="50%"
    >
      <el-form
        :model="connectionForm"
        :rules="connectionRules"
        ref="connectionFormRef"
        label-width="120px"
      >
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="connectionForm.name" placeholder="请输入连接名称" />
        </el-form-item>
        <el-form-item label="主机地址" prop="host">
          <el-input v-model="connectionForm.host" placeholder="例如: localhost, 192.168.1.100" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number v-model="connectionForm.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="connectionForm.username" placeholder="数据库用户名" />
        </el-form-item>
        <el-form-item :label="isEditing ? '密码 (留空不修改)' : '密码'" :prop="isEditing ? '' : 'password'">
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
          <el-select v-model="connectionForm.db_type" placeholder="选择数据库类型">
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
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="connectionFormVisible = false">取消</el-button>
          <el-button type="primary" @click="submitConnectionForm" :loading="submitting">
            {{ isEditing ? '更新' : '添加' }}
          </el-button>
          <el-button
            v-if="isEditing"
            type="success"
            @click="testConnectionFromForm"
            :loading="testing"
          >
            测试连接
          </el-button>
        </span>
      </template>
    </el-dialog>

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
import { ref, onMounted, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Plus, Edit, Connection } from '@element-plus/icons-vue';

// 数据库连接列表数据
const connectionsList = ref([]);
const connectionsTotal = ref(0);
const selectedConnections = ref([]);
const selectedConnection = ref(null);
const dbTypes = ref([]);
const selectedDbType = ref(null);

// 分页参数
const currentPage = ref(1);
const pageSize = ref(10);

// 对话框控制
const detailsVisible = ref(false);
const connectionFormVisible = ref(false);
const testResultVisible = ref(false);
const testResult = ref(null);

// 加载状态
const loadingTestId = ref(null);
const loadingEditId = ref(null);
const submitting = ref(false);
const testing = ref(false);
const isEditing = ref(false);

// 连接表单
const connectionFormRef = ref(null);
const connectionForm = reactive({
  id: null,
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

// 获取数据库连接列表
async function fetchConnections() {
  try {
    const response = await fetch(`/api/admin/db-connections?limit=${pageSize.value}&offset=${(currentPage.value - 1) * pageSize.value}${selectedDbType.value ? `&dbType=${selectedDbType.value}` : ''}`);
    const data = await response.json();
    
    if (data.success) {
      connectionsList.value = data.connections;
      connectionsTotal.value = data.meta.total;
      dbTypes.value = data.dbTypes || [];
    } else {
      ElMessage.error(data.message || '获取数据库连接列表失败');
    }
  } catch (error) {
    console.error('获取数据库连接列表出错:', error);
    ElMessage.error('获取数据库连接列表失败');
  }
}

// 处理分页变化
function handlePageChange(page) {
  currentPage.value = page;
  fetchConnections();
}

// 处理每页显示数量变化
function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1;
  fetchConnections();
}

// 处理数据库类型筛选变化
function handleDbTypeChange() {
  currentPage.value = 1;
  fetchConnections();
}

// 处理表格选择变化
function handleSelectionChange(selection) {
  selectedConnections.value = selection;
}

// 查看连接详情
function viewConnectionDetails(connection) {
  selectedConnection.value = connection;
  detailsVisible.value = true;
}

// 显示添加连接对话框
function showAddConnectionDialog() {
  isEditing.value = false;
  resetConnectionForm();
  connectionFormVisible.value = true;
}

// 编辑连接
async function editConnection(connection) {
  isEditing.value = true;
  loadingEditId.value = connection.id;
  
  try {
    // 获取完整的连接信息（不包含密码）
    const response = await fetch(`/api/admin/db-connections/${connection.id}`);
    const data = await response.json();
    
    if (data.success) {
      // 填充表单数据
      Object.keys(connectionForm).forEach(key => {
        if (key !== 'password') { // 不填充密码字段
          connectionForm[key] = data.connection[key];
        } else {
          connectionForm.password = ''; // 清空密码字段
        }
      });
      
      connectionFormVisible.value = true;
    } else {
      ElMessage.error(data.message || '获取连接详情失败');
    }
  } catch (error) {
    console.error('获取连接详情出错:', error);
    ElMessage.error('获取连接详情失败');
  } finally {
    loadingEditId.value = null;
  }
}

// 测试连接
async function testConnection(connection) {
  loadingTestId.value = connection.id;
  
  try {
    const response = await fetch(`/api/admin/db-connections/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: connection.id })
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
    loadingTestId.value = null;
  }
}

// 从表单测试连接
async function testConnectionFromForm() {
  if (!connectionFormRef.value) return;
  
  await connectionFormRef.value.validate(async (valid) => {
    if (!valid) return;
    
    testing.value = true;
    
    try {
      const formData = { ...connectionForm };
      
      // 如果是编辑模式且密码为空，不发送密码字段
      if (isEditing.value && !formData.password) {
        delete formData.password;
      }
      
      const response = await fetch('/api/admin/db-connections/test', {
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
      
      // 如果是编辑模式且密码为空，不发送密码字段
      if (isEditing.value && !formData.password) {
        delete formData.password;
      }
      
      const url = isEditing.value 
        ? `/api/admin/db-connections/${formData.id}` 
        : '/api/admin/db-connections';
      
      const method = isEditing.value ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        ElMessage.success(isEditing.value ? '连接更新成功' : '连接添加成功');
        connectionFormVisible.value = false;
        fetchConnections();
      } else {
        ElMessage.error(data.message || (isEditing.value ? '更新连接失败' : '添加连接失败'));
      }
    } catch (error) {
      console.error(isEditing.value ? '更新连接出错:' : '添加连接出错:', error);
      ElMessage.error(isEditing.value ? '更新连接失败' : '添加连接失败');
    } finally {
      submitting.value = false;
    }
  });
}

// 查看表
function viewTables(id) {
  router.push(`/table-management?connectionId=${id}`);
}

// 删除连接
async function deleteConnection(id) {
  try {
    await ElMessageBox.confirm('确定要删除此连接吗？此操作不可恢复', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    const response = await fetch(`/api/admin/db-connections/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      ElMessage.success('连接删除成功');
      fetchConnections();
    } else {
      ElMessage.error(data.message || '删除连接失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除连接出错:', error);
      ElMessage.error('删除连接失败');
    }
  }
}

// 批量删除连接
async function batchDeleteConnections() {
  if (selectedConnections.value.length === 0) return;
  
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedConnections.value.length} 个连接吗？此操作不可恢复`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    const ids = selectedConnections.value.map(conn => conn.id);
    
    const response = await fetch('/api/admin/db-connections/batch-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids })
    });
    
    const data = await response.json();
    
    if (data.success) {
      ElMessage.success(`成功删除 ${data.deletedCount} 个连接`);
      fetchConnections();
    } else {
      ElMessage.error(data.message || '批量删除连接失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除连接出错:', error);
      ElMessage.error('批量删除连接失败');
    }
  }
}

// 批量更新连接状态
async function batchUpdateConnectionStatus(isActive) {
  if (selectedConnections.value.length === 0) return;
  
  try {
    const statusText = isActive ? '激活' : '禁用';
    await ElMessageBox.confirm(`确定要将选中的 ${selectedConnections.value.length} 个连接设为${statusText}状态吗？`, '确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    });
    
    const ids = selectedConnections.value.map(conn => conn.id);
    
    const response = await fetch('/api/admin/db-connections/batch-update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids, isActive })
    });
    
    const data = await response.json();
    
    if (data.success) {
      ElMessage.success(`成功${statusText} ${data.updatedCount} 个连接`);
      fetchConnections();
    } else {
      ElMessage.error(data.message || `批量${statusText}连接失败`);
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(`批量${isActive ? '激活' : '禁用'}连接出错:`, error);
      ElMessage.error(`批量${isActive ? '激活' : '禁用'}连接失败`);
    }
  }
}

// 重置连接表单
function resetConnectionForm() {
  if (connectionFormRef.value) {
    connectionFormRef.value.resetFields();
  }
  
  // 重置表单数据
  Object.assign(connectionForm, {
    id: null,
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
}

// 获取数据库类型名称
function getDbTypeName(dbType) {
  const dbTypeMap = {
    'mysql': 'MySQL',
    'postgresql': 'PostgreSQL',
    'sqlserver': 'SQL Server',
    'oracle': 'Oracle',
    'sqlite': 'SQLite'
  };
  
  return dbTypeMap[dbType] || dbType;
}

// 获取数据库类型标签类型
function getDbTypeTagType(dbType) {
  const typeMap = {
    'mysql': '',
    'postgresql': 'success',
    'sqlserver': 'warning',
    'oracle': 'danger',
    'sqlite': 'info'
  };
  
  return typeMap[dbType] || '';
}

// 页面加载时获取数据
onMounted(() => {
  fetchConnections();
});
</script>

<style scoped>
.db-connections {
  padding: 20px;
}

.connections-content {
  margin-top: 20px;
}

.connections-actions {
  margin-bottom: 20px;
}

.batch-actions-inline {
  display: inline-block;
  margin-left: 10px;
}

.selected-info {
  margin-right: 10px;
  color: #606266;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.db-type-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-details {
  margin-top: 20px;
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.test-details pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
