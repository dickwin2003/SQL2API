import {
  defineEventHandler,
  getRouterParams,
  getQuery,
  readBody,
  createError,
} from "h3";
import { getClientIP, getRequestMeta } from "~/server/utils/request";
import db from "~/server/utils/db";

/**
 * 动态路由处理器
 * 根据请求路径查找对应的SQL查询并执行
 */
export default defineEventHandler(async (event) => {
  const params = getRouterParams(event);
  const path = "/api/" + (params._ || "");
  const method = event.method;

  // 查询数据库以获取API路由定义
  const routeResult = await db.get(
    `SELECT * FROM api_routes WHERE path = ? AND method = ?`,
    [path, method]
  );

  console.log(path);
  console.log(routeResult);

  // 如果未找到匹配的路由，返回404
  if (!routeResult) {
    throw createError({
      statusCode: 404,
      statusMessage: "API路由未找到",
    });
  }

  // 检查API是否公开
  if (!routeResult.is_public) {
    // 记录日志
    try {
      const ipAddress = getClientIP(event);
      const requestMeta = getRequestMeta(event);

      // 记录访问非公开API的尝试
      await db.run(
        `INSERT INTO api_logs (route_id, ip_address, request_data, response_status, execution_time) VALUES (?, ?, ?, ?, ?)`,
        [
          routeResult.id,
          ipAddress,
          JSON.stringify({
            _requestDetails: {
              ...requestMeta,
              requestTime: new Date().toISOString(),
            },
            _message: "尝试访问非公开API",
          }),
          403,
          0
        ]
      );
    } catch (logError) {
      console.error("记录访问非公开API日志失败:", logError);
    }

    // 返回友好的错误提示
    throw createError({
      statusCode: 403,
      statusMessage: "访问受限",
      data: {
        message: "此API未公开，无法直接访问",
        apiName: routeResult.name,
        apiPath: routeResult.path,
        solution: "请联系管理员将此API设置为公开，或使用授权方式访问",
      },
    });
  }

  // 获取查询参数或请求体
  const requestData =
    method === "GET" ? getQuery(event) : await readBody(event);

  // 记录日志开始时间
  const startTime = Date.now();

  try {
    // 解析参数定义
    const paramDefs: Record<string, any> = routeResult.params
      ? JSON.parse(routeResult.params as string)
      : {};

    // 检查是否需要进行参数验证和替换
    let sqlQuery = String(routeResult.sql_query);
    const sqlParams: any[] = [];

    // 处理SQL中的参数
    if (Object.keys(paramDefs).length > 0) {
      // 首先验证所有必填参数是否存在
      for (const [paramName, paramConfig] of Object.entries(paramDefs)) {
        const paramValue = requestData[paramName as keyof typeof requestData];

        // 如果参数在配置中标记为必填，但请求中没有提供
        if (
          paramConfig.required &&
          (paramValue === undefined || paramValue === null)
        ) {
          throw createError({
            statusCode: 400,
            statusMessage: `缺少必要参数: ${paramName}`,
          });
        }
      }

      // 查找并替换所有占位符，识别所有 :paramName 格式的参数
      const placeholderRegex = /:([\w]+)/g;
      let match;
      let modifiedQuery = sqlQuery;
      const placeholders: string[] = [];

      // 首先找出所有占位符
      while ((match = placeholderRegex.exec(sqlQuery)) !== null) {
        placeholders.push(match[1]); // 保存参数名（不含冒号）
      }

      // 然后替换所有占位符，并添加对应的参数值到 sqlParams
      for (let i = 0; i < placeholders.length; i++) {
        const paramName = placeholders[i];
        const paramValue = requestData[paramName as keyof typeof requestData];

        // 替换第一个匹配到的占位符为问号
        modifiedQuery = modifiedQuery.replace(`:${paramName}`, "?");

        // 添加参数值到绑定列表
        sqlParams.push(paramValue);
      }

      // 更新SQL查询语句
      sqlQuery = modifiedQuery;
    }

    // 执行SQL查询
    let result;
    console.log("sqlParams：", sqlParams);
    if (sqlParams.length > 0) {
      // 有参数的查询
      result = await db.all(sqlQuery, sqlParams);
    } else {
      // 无参数的查询
      result = await db.all(sqlQuery);
    }

    console.log("执行SQL：");
    console.log(sqlQuery);
    console.log(sqlParams);

    // 记录API调用日志
    const executionTime = Date.now() - startTime;

    try {
      // 获取IP地址和Cloudflare元数据
      const ipAddress = getClientIP(event);
      const requestMeta = getRequestMeta(event);

      // 将额外的请求信息添加到日志中
      const requestInfo = {
        ...requestData,
        _requestDetails: {
          ...requestMeta,
          requestTime: new Date().toISOString(),
        },
      };

      // 异步记录日志
      await db.run(
        `INSERT INTO api_logs (route_id, ip_address, request_data, response_status, execution_time) VALUES (?, ?, ?, ?, ?)`,
        [
          routeResult.id,
          ipAddress,
          JSON.stringify(requestInfo),
          200,
          executionTime
        ]
      );
    } catch (logError) {
      // 记录日志失败时，仅打印错误信息，不影响主流程
      console.error("API日志记录失败:", logError);
    }

    // 返回查询结果
    return {
      success: true,
      data: result, // 直接使用result，因为db.all已经返回了行数组
      meta: {
        total: result.length,
        executionTime: `${executionTime}ms`,
      },
    };
  } catch (error: any) {
    // 记录错误日志
    const executionTime = Date.now() - startTime;

    // 获取IP地址和请求元数据
    const ipAddress = getClientIP(event);
    const requestMeta = getRequestMeta(event);
    const errorStatus = error.statusCode || 500;

    // 将额外的请求信息和错误信息添加到日志中
    const requestInfo = {
      ...requestData,
      _requestDetails: {
        ...requestMeta,
        requestTime: new Date().toISOString(),
      },
      _error: {
        message: error.message || "未知错误",
        status: errorStatus,
      },
    };

    // 异步记录日志
    await db.run(
      `INSERT INTO api_logs (route_id, ip_address, request_data, response_status, execution_time) VALUES (?, ?, ?, ?, ?)`,
      [
        routeResult.id,
        ipAddress,
        JSON.stringify(requestInfo),
        errorStatus,
        executionTime
      ]
    );

    // 抛出错误
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: `SQL执行错误: ${error.message || "未知错误"}`,
    });
  }
});
