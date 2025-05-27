import { defineEventHandler, readBody, createError } from "h3";
import db from "../../../utils/db";
import { executeQuery } from "../../../utils/db-connection";

/**
 * 执行SQL查询
 * 根据数据库连接ID和SQL语句执行查询
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const body = await readBody(event);
    const { connectionId, sql, params = [], page = 1, pageSize = 20 } = body;
    
    if (!connectionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "缺少数据库连接ID",
      });
    }

    if (!sql) {
      throw createError({
        statusCode: 400,
        statusMessage: "缺少SQL语句",
      });
    }

    // 获取连接信息
    const connection = await db.get(
      `SELECT 
        id, name, host, port, username, password, 
        database_name, db_type, connection_string
       FROM db_conns 
       WHERE id = ?`,
      [connectionId]
    );

    if (!connection) {
      throw createError({
        statusCode: 404,
        statusMessage: "数据库连接不存在",
      });
    }

    // 执行查询
    const result = await executeQuery(connection, sql, params);

    // 处理分页
    const start = (page - 1) * pageSize;
    const end = page * pageSize;
    const paginatedRows = result.rows.slice(start, end);

    return {
      success: true,
      data: {
        fields: result.fields,
        rows: paginatedRows,
        total: result.rows.length,
        page,
        pageSize,
        totalPages: Math.ceil(result.rows.length / pageSize)
      }
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: `服务器错误: ${error.message || "未知错误"}`,
    });
  }
});
