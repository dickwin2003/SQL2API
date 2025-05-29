<template>
  <div class="table-management">
    <el-page-header @back="$router.go(-1)" title="返回" content="数据库表管理" />

    <div class="management-content">
      <!-- 数据库连接选择区域 -->
      <el-card class="connection-card">
        <template #header>
          <div class="card-header">
            <span>选择数据库连接</span>
            <el-button type="primary" size="small" @click="fetchConnections" :icon="Refresh">
              刷新连接
            </el-button>
          </div>
        </template>

        <el-select
          v-model="selectedConnectionId"
          placeholder="请选择数据库连接"
          style="width: 100%"
          @change="handleConnectionChange"
          :loading="loadingConnections"
        >
          <el-option
            v-for="conn in connections"
            :key="conn.id"
            :label="conn.name"
            :value="conn.id"
          >
            <div class="connection-option">
              <span>{{ conn.name }}</span>
              <el-tag size="small" :type="getDbTypeTagType(conn.db_type)">
                {{ getDbTypeName(conn.db_type) }}
              </el-tag>
            </div>
          </el-option>
        </el-select>
      </el-card>

      <!-- 表和视图列表区域 -->
      <el-card class="tables-card" v-loading="loadingTables">
        <template #header>
          <div class="card-header">
            <span>数据库表和视图</span>
            <div>
              <el-input
                v-model="searchQuery"
                placeholder="搜索表名"
                clearable
                style="width: 200px; margin-right: 10px;"
                @input="filterTables"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button type="primary" size="small" @click="fetchTables" :icon="Refresh" :disabled="!selectedConnectionId">
                刷新
              </el-button>
            </div>
          </div>
        </template>

        <div v-if="!selectedConnectionId" class="empty-state">
          <el-empty description="请先选择一个数据库连接" />
        </div>

        <div v-else-if="tables.length === 0 && !loadingTables" class="empty-state">
          <el-empty description="未找到表或视图" />
        </div>

        <div v-else>
          <el-tabs v-model="activeTabType">
            <el-tab-pane label="表" name="table">
              <el-table :data="filteredTables" style="width: 100%">
                <el-table-column prop="name" label="表名" min-width="200" />
                <el-table-column prop="rows" label="行数" width="100" />
                <el-table-column prop="size" label="大小" width="100" />
                <el-table-column prop="create_time" label="创建时间" width="180">
                  <template #default="scope">
                    {{ scope.row.create_time ? new Date(scope.row.create_time).toLocaleString() : '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="comment" label="注释" min-width="200" />
                <el-table-column label="操作" width="250" fixed="right">
                  <template #default="scope">
                    <el-button
                      type="primary"
                      size="small"
                      @click="viewTableStructure(scope.row)"
                    >
                      结构
                    </el-button>
                    <el-button
                      type="success"
                      size="small"
                      @click="viewTableData(scope.row)"
                    >
                      数据
                    </el-button>
                    <el-button
                      type="info"
                      size="small"
                      @click="createApiFromTable(scope.row)"
                    >
                      生成API
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="视图" name="view">
              <el-table :data="filteredViews" style="width: 100%">
                <el-table-column prop="name" label="视图名" min-width="200" />
                <el-table-column prop="create_time" label="创建时间" width="180">
                  <template #default="scope">
                    {{ scope.row.create_time ? new Date(scope.row.create_time).toLocaleString() : '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="comment" label="注释" min-width="200" />
                <el-table-column label="操作" width="250" fixed="right">
                  <template #default="scope">
                    <el-button
                      type="primary"
                      size="small"
                      @click="viewTableStructure(scope.row)"
                    >
                      结构
                    </el-button>
                    <el-button
                      type="success"
                      size="small"
                      @click="viewTableData(scope.row)"
                    >
                      数据
                    </el-button>
                    <el-button
                      type="info"
                      size="small"
                      @click="createApiFromTable(scope.row)"
                    >
                      生成API
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-card>
    </div>

    <!-- 表结构对话框 -->
    <el-dialog v-model="structureDialogVisible" :title="`表结构: ${selectedTable?.name || ''}`" width="70%">
      <el-table :data="tableColumns" style="width: 100%">
        <el-table-column prop="name" label="字段名" min-width="150" />
        <el-table-column prop="type" label="数据类型" width="150" />
        <el-table-column prop="nullable" label="允许空值" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.nullable ? 'info' : 'danger'" size="small">
              {{ scope.row.nullable ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="key" label="键" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.key === 'PRI'" type="danger" size="small">主键</el-tag>
            <el-tag v-else-if="scope.row.key === 'UNI'" type="warning" size="small">唯一</el-tag>
            <el-tag v-else-if="scope.row.key === 'MUL'" type="success" size="small">索引</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="default" label="默认值" width="150" />
        <el-table-column prop="extra" label="额外" width="150" />
        <el-table-column prop="comment" label="注释" min-width="200" />
      </el-table>
    </el-dialog>

    <!-- 表数据对话框 -->
    <el-dialog v-model="dataDialogVisible" :title="`表数据: ${selectedTable?.name || ''}`" width="80%">
      <div class="data-dialog-toolbar">
        <el-input
          v-model="sqlQuery"
          type="textarea"
          :rows="3"
          placeholder="输入SQL查询"
          style="margin-bottom: 10px;"
        />
        <el-button type="primary" @click="executeQuery" :loading="loadingData">
          执行查询
        </el-button>
      </div>

      <el-table
        v-if="tableData.length > 0"
        :data="tableData"
        style="width: 100%"
        max-height="400px"
        border
      >
        <el-table-column
          v-for="column in tableDataColumns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="150"
        />
      </el-table>

      <div v-else-if="!loadingData" class="empty-state">
        <el-empty description="无数据" />
      </div>

      <div class="pagination-container" v-if="tableData.length > 0">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalRows"
          :page-size="pageSize"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-dialog>

    <!-- 生成API对话框 -->
    <el-dialog v-model="apiDialogVisible" :title="`从表生成API: ${selectedTable?.name || ''}`" width="60%">
      <el-form :model="apiForm" label-width="120px">
        <el-form-item label="API名称">
          <el-input v-model="apiForm.name" placeholder="请输入API名称" />
        </el-form-item>
        <el-form-item label="API路径">
          <el-input v-model="apiForm.path" placeholder="例如: /api/products" />
        </el-form-item>
        <el-form-item label="请求方法">
          <el-select v-model="apiForm.method" placeholder="选择请求方法">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>
        <el-form-item label="SQL查询">
          <el-input
            v-model="apiForm.sql"
            type="textarea"
            :rows="5"
            placeholder="输入SQL查询"
          />
        </el-form-item>
        <el-form-item label="参数">
          <el-table :data="apiForm.params" style="width: 100%">
            <el-table-column prop="name" label="参数名">
              <template #default="scope">
                <el-input v-model="scope.row.name" placeholder="参数名" />
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="150">
              <template #default="scope">
                <el-select v-model="scope.row.type" placeholder="类型">
                  <el-option label="字符串" value="string" />
                  <el-option label="数字" value="number" />
                  <el-option label="布尔值" value="boolean" />
                  <el-option label="日期" value="date" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="required" label="必填" width="100">
              <template #default="scope">
                <el-switch v-model="scope.row.required" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button
                  type="danger"
                  size="small"
                  @click="removeParam(scope.$index)"
                  circle
                  :icon="Delete"
                />
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 10px;">
            <el-button type="primary" @click="addParam" size="small">
              添加参数
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="是否公开">
          <el-switch v-model="apiForm.isPublic" />
        </el-form-item>
        <el-form-item label="需要认证">
          <el-switch v-model="apiForm.requireAuth" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="apiForm.description"
            type="textarea"
            :rows="3"
            placeholder="API描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="apiDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveApi" :loading="savingApi">
            保存
          </el-button>
          <el-button type="success" @click="testApi" :loading="testingApi">
            测试
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加页脚组件 -->
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh, Search, Delete } from '@element-plus/icons-vue';

const router = useRouter();

// 数据库连接相关
const connections = ref([]);
const selectedConnectionId = ref(null);
const loadingConnections = ref(false);

// 表和视图相关
const tables = ref([]);
const loadingTables = ref(false);
const searchQuery = ref('');
const activeTabType = ref('table');

// 表结构相关
const structureDialogVisible = ref(false);
const selectedTable = ref(null);
const tableColumns = ref([]);

// 表数据相关
const dataDialogVisible = ref(false);
const sqlQuery = ref('');
const tableData = ref([]);
const tableDataColumns = ref([]);
const loadingData = ref(false);
const totalRows = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// API生成相关
const apiDialogVisible = ref(false);
const apiForm = reactive({
  name: '',
  path: '',
  method: 'GET',
  sql: '',
  params: [],
  isPublic: false,
  requireAuth: true,
  description: ''
});
const savingApi = ref(false);
const testingApi = ref(false);

// 获取数据库连接列表
async function fetchConnections() {
  loadingConnections.value = true;
  try {
    const response = await fetch('/api/admin/db-connections');
    const data = await response.json();
    
    if (data.success) {
      connections.value = data.connections; // 显示所有连接，不再过滤is_active
    } else {
      ElMessage.error(data.message || '获取数据库连接列表失败');
    }
  } catch (error) {
    console.error('获取数据库连接列表出错:', error);
    ElMessage.error('获取数据库连接列表失败');
  } finally {
    loadingConnections.value = false;
  }
}

// 处理连接选择变化
function handleConnectionChange() {
  if (selectedConnectionId.value) {
    fetchTables();
  } else {
    tables.value = [];
  }
}

// 获取表和视图列表
async function fetchTables() {
  if (!selectedConnectionId.value) return;
  
  loadingTables.value = true;
  try {
    const response = await fetch(`/api/admin/db-tables?connectionId=${selectedConnectionId.value}`);
    const data = await response.json();
    
    if (data.success) {
      tables.value = data.tables;
    } else {
      ElMessage.error(data.message || '获取表和视图列表失败');
    }
  } catch (error) {
    console.error('获取表和视图列表出错:', error);
    ElMessage.error('获取表和视图列表失败');
  } finally {
    loadingTables.value = false;
  }
}

// 过滤表和视图
function filterTables() {
  // 过滤逻辑在计算属性中实现
}

// 查看表结构
async function viewTableStructure(table) {
  selectedTable.value = table;
  structureDialogVisible.value = true;
  
  try {
    const response = await fetch(`/api/admin/db-tables/structure?connectionId=${selectedConnectionId.value}&tableName=${table.name}`);
    const data = await response.json();
    
    if (data.success) {
      tableColumns.value = data.columns;
    } else {
      ElMessage.error(data.message || '获取表结构失败');
    }
  } catch (error) {
    console.error('获取表结构出错:', error);
    ElMessage.error('获取表结构失败');
  }
}

// 查看表数据
async function viewTableData(table) {
  selectedTable.value = table;
  dataDialogVisible.value = true;
  sqlQuery.value = `SELECT * FROM ${table.name} LIMIT ${pageSize.value}`;
  
  executeQuery();
}

// 执行SQL查询
async function executeQuery() {
  if (!sqlQuery.value) return;
  
  loadingData.value = true;
  try {
    const response = await fetch('/api/admin/db-tables/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connectionId: selectedConnectionId.value,
        sql: sqlQuery.value,
        page: currentPage.value,
        pageSize: pageSize.value
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      tableData.value = data.data;
      tableDataColumns.value = data.columns;
      totalRows.value = data.total;
    } else {
      ElMessage.error(data.message || '执行查询失败');
    }
  } catch (error) {
    console.error('执行查询出错:', error);
    ElMessage.error('执行查询失败');
  } finally {
    loadingData.value = false;
  }
}

// 处理分页变化
function handlePageChange(page) {
  currentPage.value = page;
  executeQuery();
}

// 处理每页显示数量变化
function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1;
  executeQuery();
}

// 从表生成API
async function createApiFromTable(table) {
  selectedTable.value = table;
  apiDialogVisible.value = true;
  
  // 重置表单
  apiForm.name = `${table.name}_api`;
  apiForm.path = `/api/${table.name.toLowerCase()}`;
  apiForm.method = 'GET';
  apiForm.sql = `SELECT * FROM ${table.name} WHERE 1=1`;
  apiForm.params = [];
  apiForm.isPublic = false;
  apiForm.requireAuth = true;
  apiForm.description = `API for ${table.name} table`;
  
  // 获取表结构以生成参数
  try {
    const response = await fetch(`/api/admin/db-tables/structure?connectionId=${selectedConnectionId.value}&tableName=${table.name}`);
    const data = await response.json();
    
    if (data.success) {
      // 为主键字段添加参数
      const primaryKey = data.columns.find(col => col.key === 'PRI');
      if (primaryKey) {
        apiForm.params.push({
          name: primaryKey.name,
          type: getParamTypeFromColumnType(primaryKey.type),
          required: false
        });
        
        // 更新SQL查询
        apiForm.sql += ` AND ${primaryKey.name} = :${primaryKey.name}`;
      }
    }
  } catch (error) {
    console.error('获取表结构出错:', error);
  }
}

// 根据列类型获取参数类型
function getParamTypeFromColumnType(columnType) {
  if (columnType.includes('int') || columnType.includes('float') || columnType.includes('double') || columnType.includes('decimal')) {
    return 'number';
  } else if (columnType.includes('date') || columnType.includes('time')) {
    return 'date';
  } else if (columnType.includes('bool')) {
    return 'boolean';
  } else {
    return 'string';
  }
}

// 添加参数
function addParam() {
  apiForm.params.push({
    name: '',
    type: 'string',
    required: false
  });
}

// 移除参数
function removeParam(index) {
  apiForm.params.splice(index, 1);
}

// 保存API
async function saveApi() {
  savingApi.value = true;
  try {
    const response = await fetch('/api/admin/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: apiForm.name,
        path: apiForm.path,
        method: apiForm.method,
        sql_query: apiForm.sql,
        params: JSON.stringify(apiForm.params),
        is_public: apiForm.isPublic,
        require_auth: apiForm.requireAuth,
        description: apiForm.description,
        connection_id: selectedConnectionId.value
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      ElMessage.success('API创建成功');
      apiDialogVisible.value = false;
      
      // 询问是否跳转到API列表
      ElMessageBox.confirm('API创建成功，是否跳转到API列表页面？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        router.push('/api-list');
      }).catch(() => {});
    } else {
      ElMessage.error(data.message || '创建API失败');
    }
  } catch (error) {
    console.error('创建API出错:', error);
    ElMessage.error('创建API失败');
  } finally {
    savingApi.value = false;
  }
}

// 测试API
async function testApi() {
  testingApi.value = true;
  try {
    const response = await fetch('/api/admin/routes/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: apiForm.sql,
        params: apiForm.params,
        connection_id: selectedConnectionId.value
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      ElMessage.success('API测试成功');
      
      // 显示测试结果
      ElMessageBox.alert(JSON.stringify(data.result, null, 2), 'API测试结果', {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '确定'
      });
    } else {
      ElMessage.error(data.message || 'API测试失败');
    }
  } catch (error) {
    console.error('API测试出错:', error);
    ElMessage.error('API测试失败');
  } finally {
    testingApi.value = false;
  }
}

// 计算属性：过滤后的表
const filteredTables = computed(() => {
  if (!searchQuery.value) {
    return tables.value.filter(table => table.type === 'table');
  }
  
  const query = searchQuery.value.toLowerCase();
  return tables.value.filter(table => 
    table.type === 'table' && table.name.toLowerCase().includes(query)
  );
});

// 计算属性：过滤后的视图
const filteredViews = computed(() => {
  if (!searchQuery.value) {
    return tables.value.filter(table => table.type === 'view');
  }
  
  const query = searchQuery.value.toLowerCase();
  return tables.value.filter(table => 
    table.type === 'view' && table.name.toLowerCase().includes(query)
  );
});

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
onMounted(async () => {
  // 先同步数据库连接，确保db-config.ts和数据库中的连接同步
  try {
    await fetch('/api/admin/sync-db-connections');
  } catch (error) {
    console.error('同步数据库连接失败:', error);
  }
  
  // 然后获取连接列表
  fetchConnections();
});
</script>

<style scoped>
.table-management {
  padding: 20px;
}

.management-content {
  margin-top: 20px;
}

.connection-card {
  margin-bottom: 20px;
}

.tables-card {
  min-height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connection-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.data-dialog-toolbar {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.test-details {
  margin-top: 10px;
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
