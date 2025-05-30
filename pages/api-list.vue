<template>
  <div class="api-list">
    <el-page-header @back="$router.go(-1)" title="返回" :content="'API列表'" />

    <div class="api-content">
      <div class="api-actions">
        <el-row :gutter="20" style="width: 100%">
          <el-col :span="16">
            <el-button
              type="primary"
              @click="fetchApiList"
              :icon="Refresh"
              size="small"
              :loading="loading"
            >
              刷新
            </el-button>

            <el-button
              type="success"
              @click="$router.push('/create-api')"
              :icon="Plus"
              size="small"
            >
              创建新API
            </el-button>

            <div class="batch-actions-inline" v-if="selectedApis.length > 0">
              <el-divider direction="vertical" />
              <span class="selected-info"
                >已选择 {{ selectedApis.length }} 个API</span
              >
              <el-button
                type="primary"
                @click="batchUpdateApiStatus(true)"
                size="small"
                :disabled="selectedApis.length === 0"
              >
                设为公开
              </el-button>
              <el-button
                type="warning"
                @click="batchUpdateApiStatus(false)"
                size="small"
                :disabled="selectedApis.length === 0"
              >
                设为非公开
              </el-button>
              <el-button
                type="danger"
                @click="batchDeleteApis"
                size="small"
                :disabled="selectedApis.length === 0"
              >
                批量删除
              </el-button>
            </div>
          </el-col>
          <el-col :span="8">
            <el-select
              v-model="selectedTableId"
              clearable
              placeholder="按表筛选API"
              @change="handleTableChange"
              style="width: 100%"
            >
              <el-option label="全部API" :value="null" />
              <el-option
                v-for="table in tablesList"
                :key="table.id"
                :label="table.name"
                :value="table.id"
              >
                <div class="table-option">
                  <span>{{ table.name }}</span>
                  <el-tag size="small" type="info">{{
                    table.description || "无描述"
                  }}</el-tag>
                </div>
              </el-option>
            </el-select>
          </el-col>
        </el-row>
      </div>

      <!-- 分组显示API -->
      <div v-if="groupedApiList && Object.keys(groupedApiList).length > 0">
        <div
          v-for="(apis, groupName) in groupedApiList"
          :key="groupName"
          class="api-group"
        >
          <div class="group-header">
            <h3>{{ groupName }}</h3>
            <span class="api-count">{{ apis.length }} 个API</span>
          </div>

          <el-table
            :data="apis"
            style="width: 100%; margin-bottom: 20px"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="name" label="API名称" />
            <el-table-column prop="path" label="路径" />
            <el-table-column prop="method" label="方法" width="100" />
            <el-table-column prop="crud_operation" label="操作类型" width="100">
              <template #default="scope">
                <el-tag
                  v-if="scope.row.crud_operation"
                  :type="getCrudTagType(scope.row.crud_operation)"
                >
                  {{ getCrudOperationName(scope.row.crud_operation) }}
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="is_public" label="公开" width="80">
              <template #default="scope">
                <el-tag :type="scope.row.is_public ? 'success' : 'info'">
                  {{ scope.row.is_public ? "是" : "否" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="380">
              <template #default="scope">
                <el-button
                  type="primary"
                  size="small"
                  @click="viewApiDetails(scope.row)"
                >
                  详情
                </el-button>
                <el-button
                  type="warning"
                  size="small"
                  @click="editApi(scope.row)"
                  :icon="Edit"
                  :loading="loadingEditId === scope.row.id"
                >
                  编辑
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  @click="testApi(scope.row)"
                  :icon="VideoPlay"
                >
                  测试
                </el-button>
                <el-button
                  type="info"
                  size="small"
                  @click="viewApiLogs(scope.row)"
                  :icon="Document"
                  :loading="loadingLogsId === scope.row.id"
                >
                  日志
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="deleteApi(scope.row.id)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 当没有分组显示时，使用默认表格 -->
      <el-table
        v-else
        :data="apiList"
        style="width: 100%; margin-top: 20px"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="API名称" />
        <el-table-column prop="path" label="路径" />
        <el-table-column prop="method" label="方法" width="100" />
        <el-table-column prop="is_public" label="公开" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.is_public ? 'success' : 'info'">
              {{ scope.row.is_public ? "是" : "否" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="viewApiDetails(scope.row)"
            >
              详情
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="editApi(scope.row)"
              :icon="Edit"
              :loading="loadingEditId === scope.row.id"
            >
              编辑
            </el-button>
            <el-button
              type="success"
              size="small"
              @click="testApi(scope.row)"
              :icon="VideoPlay"
            >
              测试
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="viewApiLogs(scope.row)"
              :icon="Document"
              :loading="loadingLogsId === scope.row.id"
            >
              日志
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteApi(scope.row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- API分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="apiTotal"
          :page-size="pageSize"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <el-dialog v-model="detailsVisible" title="API详情" width="70%">
      <div v-if="selectedApi">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="API名称">{{
            selectedApi.name
          }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{
            selectedApi.description
          }}</el-descriptions-item>
          <el-descriptions-item label="路径">{{
            selectedApi.path
          }}</el-descriptions-item>
          <el-descriptions-item label="HTTP方法">{{
            selectedApi.method
          }}</el-descriptions-item>
          <el-descriptions-item label="SQL查询">
            <pre class="sql-query-display">{{ selectedApi.sql_query }}</pre>
          </el-descriptions-item>
          <el-descriptions-item label="参数">
            <pre v-if="selectedApi.params">{{
              JSON.parse(selectedApi.params)
            }}</pre>
            <span v-else>无参数</span>
          </el-descriptions-item>
          <el-descriptions-item label="公开API">
            {{ selectedApi.is_public ? "是" : "否" }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ new Date(selectedApi.created_at).toLocaleString() }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="api-test-link">
          <p>API URL示例:</p>
          <el-link type="primary" :href="apiUrl(selectedApi)" target="_blank">
            {{ apiUrl(selectedApi) }}
          </el-link>
        </div>
      </div>
    </el-dialog>

    <!-- API调用日志对话框 -->
    <el-dialog
      v-model="logsVisible"
      :title="`API调用日志 - ${selectedApiName}`"
      width="80%"
    >
      <div v-if="loadingLogs" class="logs-loading">
        <el-skeleton :rows="10" animated />
      </div>
      <div v-else>
        <div class="logs-stats">
          <el-alert
            v-if="apiLogs.length === 0"
            type="info"
            show-icon
            :closable="false"
          >
            暂无调用日志记录
          </el-alert>
          <el-row v-else>
            <el-col :span="24">
              <el-statistic title="总调用次数" :value="logsTotal" />
            </el-col>
          </el-row>
        </div>

        <el-table
          v-if="apiLogs.length > 0"
          :data="apiLogs"
          style="width: 100%; margin-top: 20px"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="ip_address" label="来源IP" width="150" />
          <el-table-column prop="response_status" label="状态码" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.response_status)">
                {{ scope.row.response_status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="execution_time" label="执行时间" width="120">
            <template #default="scope">
              {{ scope.row.execution_time }}ms
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="调用时间" width="180">
            <template #default="scope">
              {{ new Date(scope.row.created_at).toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column prop="request_data" label="请求数据">
            <template #default="scope">
              <div class="request-data">
                {{ formatRequestData(scope.row.request_data) }}
              </div>
              <el-button
                type="primary"
                link
                size="small"
                @click="viewRequestDetails(scope.row.request_data)"
              >
                查看详细
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="apiLogs.length > 0" class="pagination-container">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="logsTotal"
            :page-size="logsPageSize"
            :current-page="logsCurrentPage"
            @current-change="handleLogsPageChange"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 请求数据详情对话框 -->
    <el-dialog v-model="requestDetailsVisible" title="请求数据详情" width="50%">
      <pre class="request-details-content">{{ requestDetails }}</pre>
    </el-dialog>

    <!-- 添加页脚组件 -->
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  Refresh,
  Plus,
  VideoPlay,
  Edit,
  Document,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import AppFooter from "~/components/AppFooter.vue";

// 路由
const router = useRouter();

// API列表相关
const apiList = ref<any[]>([]);
const detailsVisible = ref(false);
const selectedApi = ref<any>(null);
const loadingEditId = ref<number | null>(null);
const selectedApis = ref<any[]>([]);

// API日志相关
const logsVisible = ref(false);
const selectedApiName = ref("");
const selectedApiId = ref<number | null>(null);
const apiLogs = ref<any[]>([]);
const loadingLogs = ref(false);
const loadingLogsId = ref<number | null>(null);
const logsTotal = ref(0);
const logsPageSize = ref(20);
const logsCurrentPage = ref(1);
const requestDetailsVisible = ref(false);
const requestDetails = ref("");

// 分页和筛选相关
const tablesList = ref<any[]>([]);
const selectedTableId = ref<number | null>(null);
const currentPage = ref(1);
const pageSize = ref(20);
const apiTotal = ref(0);
const paginationMeta = ref<any>({});

// 加在 script setup 顶部
const loading = ref(false);

// 表分组和筛选
const groupedApiList = computed(() => {
  if (!apiList.value.length) return {};

  const grouped: Record<string, any[]> = {};

  apiList.value.forEach((api) => {
    // 决定分组名称
    let groupName = "未分类API";
    if (api.table_name) {
      groupName = api.table_name;
    }

    // 初始化分组数组
    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }

    // 添加到分组
    grouped[groupName].push(api);
  });

  return grouped;
});

// 初始化
onMounted(() => {
  // 设置页面标题 (确保只在客户端运行)
  document.title = "SQL to API - API列表";

  fetchApiList();
});

// 获取API列表
const fetchApiList = async () => {
  loading.value = true;
  try {
    const response = await fetch('/api/admin/routes');
    const data = await response.json();
    if (data.success) {
      apiList.value = data.routes;
    } else {
      ElMessage.error(data.message || '获取API列表失败');
    }
  } catch (error) {
    console.error('获取API列表失败:', error);
    ElMessage.error('获取API列表失败');
  } finally {
    loading.value = false;
  }
};

// 查看API详情
const viewApiDetails = (api: any) => {
  selectedApi.value = api;
  detailsVisible.value = true;
};

// 删除API
const deleteApi = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      "确定要删除这个API吗？这个操作不可逆。",
      "警告",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    // 调用删除API接口
    const response = await fetch(`/api/admin/routes/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = (await response.json()) as { statusMessage?: string };
      throw new Error(error.statusMessage || "删除API失败");
    }

    ElMessage.success("API删除成功");
    fetchApiList();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || "删除API失败");
    }
  }
};

// 生成API URL
const apiUrl = (api: any) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}${api.path}`;
};

// 跳转到API测试页面
const testApi = (api: any) => {
  router.push({
    path: "/api-tester",
    query: { apiId: api.id },
  });
};

// 跳转到API编辑页面
const editApi = (api: any) => {
  loadingEditId.value = api.id;

  // 先检查API是否存在
  fetch(`/api/admin/routes/${api.id}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("API不存在或已被删除");
      }
      return response.json();
    })
    .then(() => {
      router.push({
        path: "/create-api",
        query: { id: api.id },
      });
    })
    .catch((error) => {
      ElMessage.error({
        message: error.message || "无法编辑API，请刷新列表后重试",
        duration: 5000,
      });
      fetchApiList(); // 刷新列表
    })
    .finally(() => {
      loadingEditId.value = null;
    });
};

// 查看API调用日志
const viewApiLogs = async (api: any) => {
  selectedApiName.value = api.name;
  selectedApiId.value = api.id;
  logsCurrentPage.value = 1;
  logsVisible.value = true;
  loadingLogsId.value = api.id;

  await fetchApiLogs();

  loadingLogsId.value = null;
};

// 获取API调用日志
const fetchApiLogs = async () => {
  if (!selectedApiId.value) return;

  loadingLogs.value = true;

  try {
    const offset = (logsCurrentPage.value - 1) * logsPageSize.value;
    const response = await fetch(
      `/api/admin/logs/route/${selectedApiId.value}?limit=${logsPageSize.value}&offset=${offset}`
    );

    if (!response.ok) {
      const error = (await response.json()) as { statusMessage?: string };
      throw new Error(error.statusMessage || "获取API调用日志失败");
    }

    const data = (await response.json()) as {
      success: boolean;
      logs: any[];
      meta: {
        total: number;
        limit: number;
        offset: number;
      };
    };

    if (data.success) {
      apiLogs.value = data.logs;
      logsTotal.value = data.meta.total;
    } else {
      apiLogs.value = [];
      logsTotal.value = 0;
    }
  } catch (error: any) {
    ElMessage.error(error.message || "获取API调用日志失败");
    apiLogs.value = [];
    logsTotal.value = 0;
  } finally {
    loadingLogs.value = false;
  }
};

// 处理日志分页变化
const handleLogsPageChange = (page: number) => {
  logsCurrentPage.value = page;
  fetchApiLogs();
};

// 格式化请求数据
const formatRequestData = (requestData: string) => {
  try {
    const data = JSON.parse(requestData);
    return JSON.stringify(data, null, 2);
  } catch {
    return requestData || "无数据";
  }
};

// 获取状态码对应的标签类型
const getStatusType = (status: number) => {
  if (status >= 200 && status < 300) {
    return "success";
  } else if (status >= 400 && status < 500) {
    return "warning";
  } else if (status >= 500) {
    return "danger";
  }
  return "info";
};

// 查看请求详情
const viewRequestDetails = (requestData: string) => {
  try {
    const data = JSON.parse(requestData);
    requestDetails.value = JSON.stringify(data, null, 2);
  } catch {
    requestDetails.value = requestData || "无数据";
  }

  requestDetailsVisible.value = true;
};

// 处理多选变化
const handleSelectionChange = (selection: any[]) => {
  selectedApis.value = selection;
};

// 批量更新API状态
const batchUpdateApiStatus = async (isPublic: boolean) => {
  if (selectedApis.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要将选中的 ${selectedApis.value.length} 个API设置为${
        isPublic ? "公开" : "非公开"
      }吗？`,
      "确认操作",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    // 获取选中的API ID
    const apiIds = selectedApis.value.map((api) => api.id);

    // 调用批量更新API
    const response = await fetch("/api/admin/routes/batch-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: apiIds,
        is_public: isPublic,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { statusMessage?: string };
      throw new Error(errorData.statusMessage || "批量更新API状态失败");
    }

    const result = (await response.json()) as {
      success: boolean;
      message: string;
      updated?: number;
    };

    if (result.success) {
      ElMessage.success(
        `成功${isPublic ? "公开" : "设为非公开"} ${result.updated || 0} 个API`
      );
      fetchApiList(); // 刷新列表
    } else {
      throw new Error("批量更新API状态失败");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || "批量更新API状态失败");
    }
  }
};

// 处理表筛选变化
const handleTableChange = () => {
  currentPage.value = 1; // 重置为第一页
  fetchApiList();
};

// 处理页码变化
const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchApiList();
};

// 处理每页数量变化
const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1; // 重置为第一页
  fetchApiList();
};

// 批量删除API
const batchDeleteApis = async () => {
  if (selectedApis.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedApis.value.length} 个API吗？这个操作不可逆。`,
      "警告",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    // 获取选中的API ID
    const apiIds = selectedApis.value.map((api) => api.id);

    // 发送删除请求
    const response = await fetch("/api/admin/routes/batch-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: apiIds,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { statusMessage?: string };
      throw new Error(errorData.statusMessage || "批量删除API失败");
    }

    const result = (await response.json()) as {
      success: boolean;
      warning?: boolean;
      message: string;
      deleted?: number;
      logsCount?: any[];
    };

    // 如果有警告，再次确认
    if (result.warning) {
      await ElMessageBox.confirm(
        `${result.message}，确定要继续删除吗？`,
        "警告",
        {
          confirmButtonText: "确定删除",
          cancelButtonText: "取消",
          type: "warning",
          dangerouslyUseHTMLString: true,
        }
      );

      // 用户确认，继续删除
      const confirmResponse = await fetch("/api/admin/routes/batch-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: apiIds,
          confirmed: true,
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = (await confirmResponse.json()) as {
          statusMessage?: string;
        };
        throw new Error(errorData.statusMessage || "批量删除API失败");
      }

      const confirmResult = (await confirmResponse.json()) as {
        success: boolean;
        message: string;
        deleted?: number;
      };

      if (confirmResult.success) {
        ElMessage.success(
          `成功删除 ${confirmResult.deleted || 0} 个API及相关日志`
        );
        fetchApiList(); // 刷新列表
      }
    } else if (result.success) {
      ElMessage.success(`成功删除 ${result.deleted || 0} 个API`);
      fetchApiList(); // 刷新列表
    } else {
      throw new Error("批量删除API失败");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || "批量删除API失败");
    }
  }
};

// 获取CRUD操作类型名称
const getCrudOperationName = (operation: string) => {
  const map: Record<string, string> = {
    READ_ALL: "读取全部",
    READ_ONE: "读取单个",
    CREATE: "创建",
    UPDATE: "更新",
    DELETE: "删除",
    SEARCH: "搜索",
  };
  return map[operation] || operation;
};

// 获取CRUD操作类型标签颜色
const getCrudTagType = (operation: string) => {
  const map: Record<string, string> = {
    READ_ALL: "info",
    READ_ONE: "info",
    CREATE: "success",
    UPDATE: "warning",
    DELETE: "danger",
    SEARCH: "primary",
  };
  return map[operation] || "";
};
</script>

<style scoped>
.api-list {
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.api-content {
  margin-top: 20px;
  flex: 1;
}

.api-actions {
  width: 100%;
  margin-bottom: 20px;
}

.sql-query-display {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  font-family: "Courier New", monospace;
}

.api-test-link {
  margin-top: 20px;
  padding: 10px;
  background-color: #f0f9eb;
  border-radius: 4px;
}

.logs-stats {
  margin-bottom: 20px;
}

.request-data {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.request-details-content {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  font-family: "Courier New", monospace;
  max-height: 400px;
  overflow-y: auto;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.el-container {
  height: 100%;
}

.footer-wrapper {
  width: 100%;
}

.api-filters {
  margin: 20px 0;
}

.batch-actions-inline {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.selected-info {
  color: #606266;
  font-size: 14px;
  margin-right: 10px;
}

.api-group {
  margin-bottom: 20px;
}

.group-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 0 10px;
  border-left: 4px solid #409eff;
}

.group-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.api-count {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
  background-color: #f2f6fc;
  padding: 2px 6px;
  border-radius: 10px;
}

.table-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
