import { defineEventHandler, getQuery, createError } from "h3";
import db from "../../../utils/db";
import { getTableStructure } from "../../../utils/db-connection";

/**
 * 获取表结构信息
 * 根据数据库连接ID和表名获取表结构
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const query = getQuery(event);
    const connectionId = query.connectionId;
    const tableName = query.tableName as string;
    
    if (!connectionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "缺少数据库连接ID",
      });
    }

    if (!tableName) {
      throw createError({
        statusCode: 400,
        statusMessage: "缺少表名",
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

    // 根据数据库类型获取表结构
    const structure = await getTableStructure(connection, tableName);

    return {
      success: true,
      structure,
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
