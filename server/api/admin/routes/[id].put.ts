import { defineEventHandler, readBody, getRouterParam, createError } from "h3";
import db from "../../../utils/db";

/**
 * 更新API路由
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const id = getRouterParam(event, "id");

    if (!id || isNaN(Number(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: "API ID无效",
      });
    }

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

    // SQL安全性验证
    if (
      body.sqlQuery.toLowerCase().includes("drop") ||
      body.sqlQuery.toLowerCase().includes("alter")
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "SQL查询中不允许包含DROP或ALTER语句",
      });
    }

    // 查询API是否存在
    const existingRoute = await db.get(
      `SELECT id FROM api_routes WHERE id = ?`,
      [id]
    );

    if (!existingRoute) {
      throw createError({
        statusCode: 404,
        statusMessage: "API路由不存在",
      });
    }

    // 检查路径和方法组合的唯一性（排除当前记录）
    const existingPathMethod = await db.get(
      `SELECT id FROM api_routes WHERE path = ? AND method = ? AND id != ?`,
      [body.path, body.method, id]
    );

    if (existingPathMethod) {
      throw createError({
        statusCode: 409,
        statusMessage: "该路径和方法组合已被其他API使用",
      });
    }

    // 更新API路由
    try {
      await db.run(
        `UPDATE api_routes 
        SET 
          name = ?, 
          description = ?, 
          path = ?, 
          method = ?, 
          sql_query = ?, 
          params = ?, 
          is_public = ?, 
          require_auth = ?,
          db_conn = ?,
          db_conn_name = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          body.name,
          body.description || "",
          body.path,
          body.method,
          body.sqlQuery,
          typeof body.params === "object" ? JSON.stringify(body.params) : "{}",
          body.isPublic === true ? 1 : 0,
          body.requireAuth === false ? 0 : 1,
          typeof body.db_conn === "object" ? JSON.stringify(body.db_conn) : "{}",
          body.db_conn_name,
          id
        ]
      );
      
      // Success if we reach this point
      const success = true;
      const error = null;
    } catch (dbError) {
      throw createError({
        statusCode: 500,
        statusMessage: `数据库错误: ${dbError.message || "未知错误"}`,
      });
    }

    return {
      success: true,
      message: "API路由更新成功",
      id: Number(id),
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

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
