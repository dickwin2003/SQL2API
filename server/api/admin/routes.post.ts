import { defineEventHandler, readBody, createError } from "h3";
import db from "../../utils/db";

/**
 * 创建新API路由
 *
 * 请求体参数:
 * @param {string} name - API名称
 * @param {string} description - API描述
 * @param {string} path - API路径
 * @param {string} method - HTTP方法 (GET, POST, PUT, DELETE)
 * @param {string} sqlQuery - SQL查询语句
 * @param {object} params - 参数定义 (可选)
 * @param {boolean} isPublic - 是否公开 (默认false)
 * @param {boolean} requireAuth - 是否需要认证 (默认true)
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const body = await readBody(event);

    // 验证必填字段
    if (!body.name || !body.path || !body.method || !body.sqlQuery) {
      throw createError({
        statusCode: 400,
        statusMessage: "缺少必要字段: name, path, method, sqlQuery",
      });
    }

    // 处理路径格式
    if (!body.path.startsWith("/")) {
      body.path = `/${body.path}`;
    }

    // 标准化HTTP方法
    body.method = body.method.toUpperCase();
    if (!["GET", "POST", "PUT", "DELETE"].includes(body.method)) {
      throw createError({
        statusCode: 400,
        statusMessage: "不支持的HTTP方法，请使用: GET, POST, PUT, DELETE",
      });
    }

    // SQL安全性验证 - 实际应用中需要更严格的验证
    if (
      body.sqlQuery.toLowerCase().includes("drop") ||
      body.sqlQuery.toLowerCase().includes("alter")
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "SQL查询中不允许包含DROP或ALTER语句",
      });
    }

    // 保存到数据库
    try {
      const result = await db.run(
        `
        INSERT INTO api_routes 
          (name, description, path, method, sql_query, params, is_public, require_auth) 
        VALUES 
          (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          body.name,
          body.description || "",
          body.path,
          body.method,
          body.sqlQuery,
          JSON.stringify(body.params || {}),
          body.isPublic === true ? 1 : 0,
          body.requireAuth === false ? 0 : 1
        ]
      );

      // 获取创建的路由ID
      const newRouteId = result.lastID;
      
      return {
        success: true,
        message: "API路由创建成功",
        id: newRouteId,
        path: body.path,
        method: body.method,
      };
    } catch (dbError) {
      // 处理数据库错误
      throw createError({
        statusCode: 500,
        statusMessage: `数据库错误: ${dbError.message || "未知错误"}`,
      });
    }
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    // 唯一性约束冲突错误
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      throw createError({
        statusCode: 409,
        statusMessage: "该路径和方法组合已存在",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: `服务器错误: ${error.message || "未知错误"}`,
    });
  }
});
