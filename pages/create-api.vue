<template>
  <div class="create-api">
    <el-page-header
      @back="$router.go(-1)"
      title="返回"
      :content="isEditing ? '编辑API' : '创建API'"
    />

    <div class="api-content">
      <el-form
        :model="apiForm"
        label-width="120px"
        :rules="rules"
        ref="apiFormRef"
      >
        <!-- 数据库连接选择 (最重要的部分放在最上面) -->
        <el-form-item label="数据库连接" prop="connectionId" class="important-field">
          <el-select 
            v-model="apiForm.connectionId" 
            placeholder="选择数据库连接"
            @change="handleConnectionChange"
            style="width: 100%"
          >
            <el-option
              v-for="conn in connections"
              :key="conn.id"
              :label="`${conn.name} (${getDbTypeName(conn.db_type)})`"
              :value="conn.id"
            />
          </el-select>
        </el-form-item>

        <!-- 两列布局的表单字段 -->
        <div class="form-grid">
          <div class="form-column">
            <el-form-item label="API名称" prop="name">
              <el-input v-model="apiForm.name" placeholder="输入API名称" />
            </el-form-item>

            <el-form-item label="API路径" prop="path">
              <el-input v-model="apiForm.path" placeholder="/data/users">
                <template #prepend>/api</template>
              </el-input>
            </el-form-item>
          </div>

          <div class="form-column">
            <el-form-item label="描述" prop="description">
              <el-input
                v-model="apiForm.description"
                type="textarea"
                placeholder="API描述"
                :rows="1"
              />
            </el-form-item>

            <el-form-item label="HTTP方法" prop="method">
              <el-select v-model="apiForm.method" placeholder="选择HTTP方法" style="width: 100%">
                <el-option label="GET" value="GET" />
                <el-option label="POST" value="POST" />
                <el-option label="PUT" value="PUT" />
                <el-option label="DELETE" value="DELETE" />
              </el-select>
            </el-form-item>
          </div>
        </div>

        <!-- SQL查询编辑器 -->
        <el-form-item label="SQL查询" prop="sqlQuery" class="sql-query-section">
          <div class="sql-form-item">
            <div class="sql-help-text">
              <i class="el-icon-info"></i>
              输入有效的SQL查询语句。支持参数化查询，使用 :参数名
              的方式引用参数。
            </div>
            <client-only>
              <div class="editor-container">
                <div ref="sqlEditorContainer" class="sql-editor"></div>
              </div>
              <template #fallback>
                <div class="editor-placeholder">
                  <el-skeleton :rows="8" animated />
                </div>
              </template>
            </client-only>
            <div class="sql-example">
              示例：SELECT * FROM users WHERE id = :userId AND status = :status
            </div>
          </div>
        </el-form-item>

        <el-form-item label="参数定义">
          <el-button type="primary" @click="addParam" :icon="Plus" size="small">
            添加参数
          </el-button>

          <el-table
            :data="apiForm.params"
            style="width: 100%; margin-top: 10px"
          >
            <el-table-column prop="name" label="参数名" width="180">
              <template #default="scope">
                <el-input
                  v-model="scope.row.name"
                  placeholder="参数名"
                  size="small"
                />
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="180">
              <template #default="scope">
                <el-select
                  v-model="scope.row.type"
                  placeholder="类型"
                  size="small"
                >
                  <el-option label="字符串" value="string" />
                  <el-option label="数字" value="number" />
                  <el-option label="布尔值" value="boolean" />
                  <el-option label="日期" value="date" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="required" label="必填" width="80">
              <template #default="scope">
                <el-switch v-model="scope.row.required" />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述">
              <template #default="scope">
                <el-input
                  v-model="scope.row.description"
                  placeholder="描述"
                  size="small"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="scope">
                <el-button
                  @click="removeParam(scope.$index)"
                  type="danger"
                  :icon="Delete"
                  circle
                  size="small"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>

        <el-form-item label="公开API">
          <el-switch v-model="apiForm.isPublic" />
          <div class="help-text">公开API可以不需要认证直接访问</div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitForm">{{
            isEditing ? "更新API" : "创建API"
          }}</el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button @click="$router.push('/api-list')">查看API列表</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 添加页脚组件 -->
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  onMounted,
  nextTick,
  computed,
  shallowRef,
  onUnmounted,
  watch,
} from "vue";
import { Plus, Delete } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { useRouter, useRoute } from "vue-router";
import { useNuxtApp } from "#app";
import AppFooter from "~/components/AppFooter.vue";

// 編輯模式標誌
const route = useRoute();
const isEditing = computed(() => !!route.query.id);

// 编辑模式标志
const apiId = computed(() => (route.query.id ? Number(route.query.id) : null));

// 页面标题
const pageTitle = computed(() => (isEditing.value ? "编辑API" : "创建API"));

// Monaco编辑器实例和模块引用
const monaco = shallowRef();
const sqlEditor = shallowRef();

// 获取nuxt应用实例，用于访问loadMonacoCDN函数
const nuxtApp = useNuxtApp();

// 路由
const router = useRouter();

// 表单ref
const apiFormRef = ref<FormInstance>();

// 表单数据
const apiForm = reactive({
  name: "",
  description: "",
  path: "",
  method: "GET",
  connectionId: null,
  sqlQuery: "SELECT * FROM users",
  params: [] as Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>,
  isPublic: false,
  requireAuth: true,
});

// 表单验证规则
const rules = reactive<FormRules>({
  name: [
    { required: true, message: "请输入API名称", trigger: "blur" },
    { min: 2, max: 50, message: "长度应为2到50个字符", trigger: "blur" },
  ],
  path: [
    { required: true, message: "请输入API路径", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9\/_-]+$/,
      message: "路径只能包含字母、数字、下划线和连字符",
      trigger: "blur",
    },
  ],
  method: [{ required: true, message: "请选择HTTP方法", trigger: "change" }],
  sqlQuery: [{ required: true, message: "请输入SQL查询", trigger: "blur" }],
  connectionId: [{ required: true, message: "请选择数据库连接", trigger: "change" }],
});

// SQL编辑器相关
const sqlEditorContainer = ref<HTMLElement | null>(null);

// 缓存获取到的API数据
const cachedApiData = ref<any>(null);

// 标记编辑器是否已初始化
const isEditorInitialized = ref(false);

// 监听器清理函数
let editorCheckInterval: any = null;

// 数据库连接相关
const connections = ref([]);
const loadingConnections = ref(false);

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
  // 可以在这里添加连接变化后的处理逻辑
  console.log('Selected connection:', apiForm.connectionId);
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

// 监听editMode和路由变化
watch(
  () => route.query.id,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      // ID变化时，重新获取API详情
      const id = Number(newVal);
      if (!isNaN(id)) {
        fetchApiDetails(id).then(() => {
          // 如果编辑器已初始化，确保应用新的SQL
          if (
            isEditorInitialized.value &&
            sqlEditor.value &&
            cachedApiData.value?.sql_query
          ) {
            sqlEditor.value.setValue(cachedApiData.value.sql_query);
          }
        });
      }
    }
  }
);

// 初始化
onMounted(async () => {
  // 设置页面标题 (确保只在客户端运行)
  updatePageTitle();

  await fetchApiList();

  // 如果是编辑模式，先加载API数据
  if (isEditing.value && apiId.value) {
    await fetchApiDetails(apiId.value);
  }

  // 使用CDN加载Monaco编辑器
  if (typeof window !== "undefined") {
    try {
      monaco.value = await nuxtApp.$loadMonacoCDN();
      if (monaco.value) {
        await nextTick();
        initSqlEditor();

        // 添加窗口大小变化的监听器，确保编辑器正确调整大小
        window.addEventListener("resize", () => {
          if (sqlEditor.value) {
            sqlEditor.value.layout();
          }
        });
      }
    } catch (error) {
      console.error("Failed to load monaco-editor:", error);
      ElMessage.error("编辑器加载失败，请刷新页面重试");
    }
  }

  await fetchConnections();
});

// 监听编辑模式变化，更新页面标题
watch(isEditing, () => {
  updatePageTitle();
});

// 监听数据库连接列表变化
watch(connections, (newConnections) => {
  // 如果已经有缓存的API数据且有db_conn_name，则尝试设置连接ID
  if (cachedApiData.value?.db_conn_name && newConnections.length > 0 && !apiForm.connectionId) {
    const connection = newConnections.find(conn => conn.name === cachedApiData.value.db_conn_name);
    if (connection) {
      apiForm.connectionId = connection.id;
      console.log(`连接加载后设置数据库连接ID: ${connection.id} (${cachedApiData.value.db_conn_name})`);
    }
  }
}, { immediate: true });

// 更新页面标题
const updatePageTitle = () => {
  document.title = `SQL to API - ${isEditing.value ? "编辑API" : "创建API"}`;
};

// 在组件卸载时清理
onUnmounted(() => {
  // 移除事件监听器
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", () => {
      if (sqlEditor.value) {
        sqlEditor.value.layout();
      }
    });
  }

  // 清除检查间隔
  if (editorCheckInterval) {
    clearInterval(editorCheckInterval);
    editorCheckInterval = null;
  }

  // 销毁编辑器实例
  if (sqlEditor.value) {
    sqlEditor.value.dispose();
  }
});

// 获取API列表（确保API编辑页面也加载API列表信息）
const fetchApiList = async () => {
  try {
    // 可选择性地实现，如果需要在编辑页面显示API列表相关信息
  } catch (error) {
    // 错误处理
  }
};

// 初始化SQL编辑器
const initSqlEditor = () => {
  if (!monaco.value || !sqlEditorContainer.value) return;

  // 确保容器尺寸正确
  try {
    setTimeout(() => {
      // 使用缓存的API数据或默认值
      const initialSql =
        cachedApiData.value?.sql_query ||
        apiForm.sqlQuery ||
        "SELECT * FROM users";

      sqlEditor.value = monaco.value.editor.create(sqlEditorContainer.value, {
        value: initialSql,
        language: "sql",
        theme: "vs",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: "on",
        glyphMargin: true,
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        automaticLayout: true, // 添加自动布局支持
        fontSize: 14, // 设置字体大小
        padding: { top: 10, bottom: 10 }, // 添加内边距
      });

      sqlEditor.value.onDidChangeModelContent(() => {
        apiForm.sqlQuery = sqlEditor.value?.getValue() || "";
      });

      // 强制编辑器重新计算布局
      sqlEditor.value.layout();

      // 确保当前SQL查询与API数据匹配
      if (
        cachedApiData.value?.sql_query &&
        sqlEditor.value.getValue() !== cachedApiData.value.sql_query
      ) {
        sqlEditor.value.setValue(cachedApiData.value.sql_query);
      }

      // 标记编辑器初始化完成
      isEditorInitialized.value = true;

      // 设置一个短期检查，确保SQL内容正确显示
      if (editorCheckInterval) {
        clearInterval(editorCheckInterval);
      }

      editorCheckInterval = setInterval(() => {
        if (
          cachedApiData.value?.sql_query &&
          sqlEditor.value &&
          sqlEditor.value.getValue() !== cachedApiData.value.sql_query
        ) {
          sqlEditor.value.setValue(cachedApiData.value.sql_query);
        } else {
          // 已确认内容正确或无需更新，清除检查
          clearInterval(editorCheckInterval);
          editorCheckInterval = null;
        }
      }, 500);

      // 最多检查3秒，然后自动清除
      setTimeout(() => {
        if (editorCheckInterval) {
          clearInterval(editorCheckInterval);
          editorCheckInterval = null;
        }
      }, 3000);
    }, 100);
  } catch (error) {
    console.error("Monaco editor initialization failed:", error);
    ElMessage.error("编辑器初始化失败，请刷新页面重试");
  }
};

// 获取API详情
const fetchApiDetails = async (id: number) => {
  try {
    const response = await fetch(`/api/admin/routes/${id}`);

    if (!response.ok) {
      const error = (await response.json()) as { statusMessage?: string };
      throw new Error(error.statusMessage || "获取API详情失败");
    }

    const result = (await response.json()) as {
      success: boolean;
      route: any;
    };

    if (result.success && result.route) {
      // 填充表单数据
      const api = result.route;
      cachedApiData.value = api; // 缓存API数据

      apiForm.name = api.name;
      apiForm.description = api.description || "";
      apiForm.path = api.path.startsWith("/api/")
        ? api.path.substring(4)
        : api.path;
      apiForm.method = api.method;
      apiForm.isPublic = !!api.is_public;
      apiForm.requireAuth = !!api.require_auth;
      apiForm.sqlQuery = api.sql_query || "SELECT * FROM users"; // 确保更新表单数据中的SQL查询
      
      // 设置数据库连接ID
      if (api.db_conn_name && connections.value.length > 0) {
        // 根据db_conn_name查找对应的连接ID
        const connection = connections.value.find(conn => conn.name === api.db_conn_name);
        if (connection) {
          apiForm.connectionId = connection.id;
          console.log(`已设置数据库连接ID: ${connection.id} (${api.db_conn_name})`);
        } else {
          console.warn(`未找到名为 ${api.db_conn_name} 的数据库连接`);
        }
      } else if (api.connection_id) {
        // 如果有connection_id字段，直接使用
        apiForm.connectionId = api.connection_id;
        console.log(`已设置数据库连接ID: ${api.connection_id}`);
      }

      // 更新SQL编辑器内容（如果编辑器已初始化）
      if (sqlEditor.value && api.sql_query) {
        sqlEditor.value.setValue(api.sql_query);
      }

      // 处理参数
      apiForm.params = [];
      if (api.params) {
        try {
          const params = JSON.parse(api.params);
          for (const [name, config] of Object.entries(params)) {
            apiForm.params.push({
              name,
              type: (config as any).type || "string",
              required: (config as any).required || false,
              description: (config as any).description || "",
            });
          }
        } catch (e) {
          console.error("解析参数错误", e);
        }
      }
    } else {
      throw new Error("获取API详情返回格式错误");
    }
  } catch (error: any) {
    ElMessage.error({
      message: error.message || "获取API详情失败",
      duration: 5000,
    });
    console.error("获取API详情错误:", error);
    // 如果获取详情失败，返回列表页
    setTimeout(() => {
      router.push("/api-list");
    }, 1000);
  }
};

// 添加参数
const addParam = () => {
  apiForm.params.push({
    name: "",
    type: "string",
    required: false,
    description: "",
  });
};

// 移除参数
const removeParam = (index: number) => {
  apiForm.params.splice(index, 1);
};

// 提交表单
const submitForm = async () => {
  if (!apiFormRef.value) return;

  await apiFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 获取编辑器中的SQL
        if (sqlEditor.value) {
          apiForm.sqlQuery = sqlEditor.value.getValue();
        }

        // 获取选中的数据库连接信息
        const selectedConnection = connections.value.find(
          (conn) => conn.id === apiForm.connectionId
        );

        if (!selectedConnection) {
          throw new Error("请选择数据库连接");
        }

        // 构建要提交的API数据
        const apiData = {
          name: apiForm.name,
          description: apiForm.description,
          path: apiForm.path.startsWith('/api/') ? apiForm.path : `/api/${apiForm.path}`,
          method: apiForm.method,
          connectionId: apiForm.connectionId,
          sqlQuery: apiForm.sqlQuery,
          // 添加数据库连接信息
          db_conn: {
            host: selectedConnection.host,
            port: selectedConnection.port,
            username: selectedConnection.username,
            password: selectedConnection.password,
            database_name: selectedConnection.database_name,
            db_type: selectedConnection.db_type
          },
          db_conn_name: selectedConnection.name,
          params:
            apiForm.params.length > 0
              ? apiForm.params.reduce((obj: any, item) => {
                  obj[item.name] = {
                    type: item.type,
                    required: item.required,
                    description: item.description,
                  };
                  return obj;
                }, {})
              : undefined,
          isPublic: apiForm.isPublic,
          requireAuth: apiForm.requireAuth,
        };

        let response;

        // 根据模式决定是创建还是更新
        if (isEditing.value && apiId.value) {
          // 更新API
          response = await fetch(`/api/admin/routes/${apiId.value}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(apiData),
          });
        } else {
          // 创建API
          response = await fetch("/api/admin/routes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(apiData),
          });
        }

        const result = (await response.json()) as {
          success?: boolean;
          statusMessage?: string;
        };

        if (response.ok) {
          ElMessage.success(
            isEditing.value ? "API更新成功！" : "API创建成功！"
          );
          resetForm();
          // 操作成功后跳转到API列表页面
          router.push("/api-list");
        } else {
          throw new Error(
            result.statusMessage ||
              (isEditing.value ? "更新API失败" : "创建API失败")
          );
        }
      } catch (error: any) {
        ElMessage.error(
          error.message ||
            (isEditing.value ? "更新API时发生错误" : "创建API时发生错误")
        );
      }
    } else {
      ElMessage.warning("请填写所有必填字段");
    }
  });
};

// 重置表单
const resetForm = () => {
  if (apiFormRef.value) {
    apiFormRef.value.resetFields();
  }

  // 重置SQL编辑器内容
  if (sqlEditor.value) {
    sqlEditor.value.setValue("SELECT * FROM users");
  }

  // 重置参数
  apiForm.params = [];
};
</script>

<style scoped>
.create-api {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.api-content {
  flex: 1;
}

/* 两列布局样式 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-column {
  min-width: 0; /* 防止内容溢出 */
}

/* 重要字段样式 */
.important-field {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 2px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.sql-editor {
  height: 300px;
  width: 100%;
  min-height: 150px;
}

.help-text {
  color: #909399;
  font-size: 12px;
  margin-top: 5px;
}

.editor-placeholder {
  height: 300px;
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  padding: 10px;
}

.sql-query-section {
  margin-top: 12px;
  padding-top: 20px;
  border-top: 1px dashed #e9ecef;
}

.sql-form-item {
  width: 100%;
}

.sql-help-text {
  margin-bottom: 8px;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}

.sql-example {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
  font-family: monospace;
  background-color: #f8f8f8;
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}
</style>
