import { defineEventHandler, createError, readBody } from "h3";
import db from "../../../utils/db";

/**
 * 创建新的API路由
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const {
      name,
      description,
      path,
      method,
      connectionId, // 添加数据库连接ID
      sqlQuery,
      params,
      isPublic,
      requireAuth,
    } = body;

    // 验证必填字段
    if (!name || !path || !method || !connectionId || !sqlQuery) {
      throw createError({
        statusCode: 400,
        statusMessage: "缺少必填字段",
      });
    }

    // 验证数据库连接是否存在
    const connection = await db.get(
      "SELECT id, name FROM db_conns WHERE id = ? AND is_active = 1",
      [connectionId]
    );

    if (!connection) {
      throw createError({
        statusCode: 400,
        statusMessage: "数据库连接不存在或未激活",
      });
    }
    
    // 获取数据库连接名称
    const dbConnName = connection.name;
    console.log('数据库连接名称:', dbConnName);

    // 插入API路由
    const result = await db.run(
      `INSERT INTO api_routes (
        name, description, path, method, connection_id, db_conn_name,
        sql_query, params, is_public, require_auth,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        name,
        description,
        path,
        method,
        connectionId,
        dbConnName,  // 添加数据库连接名称
        sqlQuery,
        params ? JSON.stringify(params) : null,
        isPublic ? 1 : 0,
        requireAuth ? 1 : 0,
      ]
    );

    return {
      success: true,
      message: "API路由创建成功",
      routeId: result.lastID,
    };
  } catch (error: any) {
    console.error("创建API路由失败:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "创建API路由失败",
    });
  }
}); 