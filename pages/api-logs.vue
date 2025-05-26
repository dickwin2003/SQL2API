<template>
  <div class="api-logs">
    <el-page-header
      @back="$router.go(-1)"
      title="返回"
      :content="'API调用日志'"
    />

    <div class="logs-content">
      <!-- 筛选条件表单 -->
      <el-card class="filter-card">
        <template #header>
          <div class="card-header">
            <h3>筛选条件</h3>
          </div>
        </template>

        <el-form :model="filterForm" label-width="80px" inline>
          <el-form-item label="API">
            <el-select
              v-model="filterForm.routeId"
              placeholder="选择API"
              clearable
              filterable
              style="width: 220px"
            >
              <el-option
                v-for="route in apiRoutes"
                :key="route.id"
                :label="`${route.name} (${route.method})`"
                :value="route.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="状态码">
            <el-select
              v-model="filterForm.status"
              placeholder="选择状态码"
              clearable
              style="width: 150px"
            >
              <el-option label="成功 (2xx)" value="200" />
              <el-option label="客户端错误 (4xx)" value="400" />
              <el-option label="服务器错误 (5xx)" value="500" />
            </el-select>
          </el-form-item>

          <el-form-item label="IP地址">
            <el-input
              v-model="filterForm.ipAddress"
              placeholder="输入IP地址"
              clearable
              style="width: 180px"
            />
          </el-form-item>

          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              :shortcuts="dateShortcuts"
              style="width: 380px"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="applyFilter">
              <el-icon><Search /></el-icon> 筛选
            </el-button>
            <el-button @click="resetFilter">
              <el-icon><RefreshRight /></el-icon> 重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 日志统计信息 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="8">
          <el-card shadow="hover">
            <el-statistic title="总调用次数" :value="logsTotal">
              <template #suffix>
                <span class="small-text">次</span>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <el-statistic title="平均响应时间" :value="averageTime">
              <template #suffix>
                <span class="small-text">ms</span>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <el-statistic title="成功率" :value="successRate">
              <template #suffix>
                <span class="small-text">%</span>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>

      <!-- 日志数据表格 -->
      <el-card class="table-card">
        <template #header>
          <div class="card-header">
            <h3>调用记录</h3>
            <el-button
              type="primary"
              size="small"
              @click="fetchLogs"
              :icon="Refresh"
              :loading="loading"
            >
              刷新
            </el-button>
          </div>
        </template>

        <div v-if="loading" class="logs-loading">
          <el-skeleton :rows="10" animated />
        </div>

        <el-empty v-else-if="apiLogs.length === 0" description="暂无日志记录" />

        <div v-else>
          <el-table :data="apiLogs" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column label="API信息" min-width="220">
              <template #default="scope">
                <div class="api-info">
                  <div class="api-name">{{ scope.row.api_name }}</div>
                  <div class="api-path">
                    <el-tag
                      size="small"
                      :type="getMethodType(scope.row.api_method)"
                    >
                      {{ scope.row.api_method }}
                    </el-tag>
                    {{ scope.row.api_path }}
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="来源IP" width="180">
              <template #default="scope">
                <div>
                  {{ scope.row.ip_address }}
                  <el-tooltip
                    effect="dark"
                    placement="top"
                    v-if="hasClientDetails(scope.row.request_data)"
                  >
                    <template #content>
                      <div>
                        <p
                          v-if="
                            parseClientDetails(scope.row.request_data).userAgent
                          "
                        >
                          <strong>用户代理：</strong
                          >{{
                            parseClientDetails(scope.row.request_data).userAgent
                          }}
                        </p>
                        <p
                          v-if="
                            parseClientDetails(scope.row.request_data).referer
                          "
                        >
                          <strong>来源页面：</strong
                          >{{
                            parseClientDetails(scope.row.request_data).referer
                          }}
                        </p>
                        <p
                          v-if="
                            parseClientDetails(scope.row.request_data)
                              .requestTime
                          "
                        >
                          <strong>请求时间：</strong
                          >{{
                            parseClientDetails(scope.row.request_data)
                              .requestTime
                          }}
                        </p>
                      </div>
                    </template>
                    <el-icon class="info-icon"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
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
                {{
                  new Date(
                    new Date(scope.row.created_at).getTime() +
                      8 * 60 * 60 * 1000
                  ).toLocaleString()
                }}
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

          <div class="pagination-container">
            <el-pagination
              background
              layout="total, sizes, prev, pager, next, jumper"
              :total="logsTotal"
              :page-sizes="[10, 20, 50, 100]"
              :page-size="pageSize"
              :current-page="currentPage"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 请求数据详情对话框 -->
    <el-dialog v-model="requestDetailsVisible" title="请求数据详情" width="60%">
      <div
        class="request-details-header"
        v-if="
          requestDetailsClientInfo.userAgent || requestDetailsClientInfo.referer
        "
      >
        <h4>请求客户端信息</h4>
        <div class="client-info">
          <p v-if="requestDetailsClientInfo.userAgent">
            <strong>用户代理：</strong> {{ requestDetailsClientInfo.userAgent }}
          </p>
          <p v-if="requestDetailsClientInfo.referer">
            <strong>来源页面：</strong> {{ requestDetailsClientInfo.referer }}
          </p>
          <p v-if="requestDetailsClientInfo.requestTime">
            <strong>请求时间：</strong>
            {{ requestDetailsClientInfo.requestTime }}
          </p>
        </div>
      </div>
      <h4>请求参数</h4>
      <pre class="request-details-content">{{ requestDetails }}</pre>
    </el-dialog>

    <!-- 添加页脚组件 -->
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  Search,
  RefreshRight,
  Refresh,
  InfoFilled,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import AppFooter from "~/components/AppFooter.vue";

// API路由列表
const apiRoutes = ref<any[]>([]);

// 日志记录相关
const apiLogs = ref<any[]>([]);
const loading = ref(false);
const logsTotal = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// 筛选表单
const filterForm = ref({
  routeId: null as number | null,
  status: null as string | null,
  ipAddress: null as string | null,
});

// 日期范围选择
const dateRange = ref<[Date, Date] | null>(null);

// 统计数据
const averageTime = computed(() => {
  if (apiLogs.value.length === 0) return 0;
  const totalTime = apiLogs.value.reduce(
    (sum, log) => sum + (log.execution_time || 0),
    0
  );
  return Math.round(totalTime / apiLogs.value.length);
});

const successRate = computed(() => {
  if (apiLogs.value.length === 0) return 0;
  const successCount = apiLogs.value.filter(
    (log) => log.response_status >= 200 && log.response_status < 300
  ).length;
  return Math.round((successCount / apiLogs.value.length) * 100);
});

// 请求详情查看相关
const requestDetailsVisible = ref(false);
const requestDetails = ref("");
const requestDetailsClientInfo = ref({
  userAgent: "",
  referer: "",
  requestTime: "",
});

// 日期快捷选项
const dateShortcuts = [
  {
    text: "最近一小时",
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000);
      return [start, end];
    },
  },
  {
    text: "今天",
    value: () => {
      const end = new Date();
      const start = new Date(new Date().toDateString());
      return [start, end];
    },
  },
  {
    text: "昨天",
    value: () => {
      const end = new Date(new Date().toDateString());
      const start = new Date(new Date().toDateString());
      start.setTime(start.getTime() - 3600 * 1000 * 24);
      end.setTime(end.getTime() - 1000); // 昨天的最后一秒
      return [start, end];
    },
  },
  {
    text: "最近一周",
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
      return [start, end];
    },
  },
];

// 初始化
onMounted(async () => {
  // 设置页面标题 (确保只在客户端运行)
  document.title = "SQL to API - API调用日志";

  await fetchApiRoutes();
  await fetchLogs();
});

// 获取所有API路由
const fetchApiRoutes = async () => {
  try {
    const response = await fetch("/api/admin/logs-routes");

    if (!response.ok) {
      const error = (await response.json()) as { statusMessage?: string };
      throw new Error(error.statusMessage || "获取API路由列表失败");
    }

    const data = (await response.json()) as { success: boolean; routes: any[] };

    if (data.success) {
      apiRoutes.value = data.routes;
    }
  } catch (error: any) {
    ElMessage.error(error.message || "获取API路由列表失败");
  }
};

// 获取API调用日志
const fetchLogs = async () => {
  loading.value = true;

  try {
    // 构建查询参数
    const params = new URLSearchParams();

    // 添加分页参数
    params.append("limit", pageSize.value.toString());
    params.append(
      "offset",
      ((currentPage.value - 1) * pageSize.value).toString()
    );

    // 添加筛选条件
    if (filterForm.value.routeId) {
      params.append("routeId", filterForm.value.routeId.toString());
    }

    if (filterForm.value.status) {
      params.append("status", filterForm.value.status);
    }

    if (filterForm.value.ipAddress) {
      params.append("ipAddress", filterForm.value.ipAddress);
    }

    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      params.append("startDate", dateRange.value[0].toISOString());
      params.append("endDate", dateRange.value[1].toISOString());
    }

    const response = await fetch(`/api/admin/logs?${params.toString()}`);

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
    loading.value = false;
  }
};

// 应用筛选条件
const applyFilter = () => {
  currentPage.value = 1; // 重置到第一页
  fetchLogs();
};

// 重置筛选条件
const resetFilter = () => {
  filterForm.value = {
    routeId: null,
    status: null,
    ipAddress: null,
  };
  dateRange.value = null;
  currentPage.value = 1;
  fetchLogs();
};

// 处理页码变化
const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  fetchLogs();
};

// 处理每页数量变化
const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1; // 重置到第一页
  fetchLogs();
};

// 查看请求详情
const viewRequestDetails = (requestData: string) => {
  try {
    const data = JSON.parse(requestData);
    // 提取客户端信息
    if (data._requestDetails) {
      requestDetailsClientInfo.value = {
        userAgent: data._requestDetails.userAgent || "",
        referer: data._requestDetails.referer || "",
        requestTime: data._requestDetails.requestTime || "",
      };

      // 创建一个不包含内部字段的数据副本用于显示
      const displayData = { ...data };
      delete displayData._requestDetails;
      delete displayData._error;

      requestDetails.value = JSON.stringify(displayData, null, 2);
    } else {
      requestDetailsClientInfo.value = {
        userAgent: "",
        referer: "",
        requestTime: "",
      };
      requestDetails.value = JSON.stringify(data, null, 2);
    }
  } catch {
    requestDetailsClientInfo.value = {
      userAgent: "",
      referer: "",
      requestTime: "",
    };
    requestDetails.value = requestData || "无数据";
  }

  requestDetailsVisible.value = true;
};

// 格式化请求数据
const formatRequestData = (requestData: string) => {
  try {
    const data = JSON.parse(requestData);
    return JSON.stringify(data);
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

// 获取HTTP方法对应的标签类型
const getMethodType = (method: string) => {
  switch (method) {
    case "GET":
      return "success";
    case "POST":
      return "primary";
    case "PUT":
      return "warning";
    case "DELETE":
      return "danger";
    default:
      return "info";
  }
};

// 检查是否有客户端详细信息
const hasClientDetails = (requestData: string) => {
  try {
    const data = JSON.parse(requestData);
    return (
      data._requestDetails &&
      (data._requestDetails.userAgent !== "未知" ||
        data._requestDetails.referer ||
        data._requestDetails.requestTime)
    );
  } catch {
    return false;
  }
};

// 解析客户端详细信息
const parseClientDetails = (requestData: string) => {
  try {
    const data = JSON.parse(requestData);
    if (data._requestDetails) {
      return {
        userAgent: data._requestDetails.userAgent || "",
        referer: data._requestDetails.referer || "",
        requestTime: data._requestDetails.requestTime || "",
      };
    }
  } catch {
    // 解析错误，返回空对象
  }
  return {
    userAgent: "",
    referer: "",
    requestTime: "",
  };
};
</script>

<style scoped>
.api-logs {
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.logs-content {
  margin-top: 20px;
  flex: 1;
}

.filter-card {
  margin-bottom: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.api-info {
  display: flex;
  flex-direction: column;
}

.api-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.api-path {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
}

.request-data {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.small-text {
  font-size: 12px;
  color: #999;
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

.logs-loading {
  padding: 20px 0;
}

.info-icon {
  margin-left: 4px;
  color: #909399;
  font-size: 14px;
}

.request-details-header {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.client-info {
  background-color: #f8f9fb;
  padding: 12px;
  border-radius: 4px;
  margin-top: 10px;
}

.client-info p {
  margin: 5px 0;
  font-size: 14px;
}
</style>
