import { defineEventHandler, getQuery, createError } from "h3";
import db from "../../../utils/db";
import { getDatabaseTables } from "../../../utils/db-connection";

/**
 * 获取数据库表和视图列表
 * 根据数据库连接ID获取表和视图列表
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const query = getQuery(event);
    const connectionId = query.connectionId;
    
    if (!connectionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "缺少数据库连接ID",
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

    // 根据数据库类型获取表和视图列表
    const tables = await getDatabaseTables(connection);

    return {
      success: true,
      tables,
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
