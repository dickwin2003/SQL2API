import { defineEventHandler, createError, getRouterParam } from "h3";
import db from "../../../utils/db";

/**
 * 删除数据库连接配置
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "缺少连接ID",
      });
    }

    // 检查连接是否存在
    const existingConnection = await db.get(
      "SELECT id FROM db_conns WHERE id = ?",
      [id]
    );

    if (!existingConnection) {
      throw createError({
        statusCode: 404,
        statusMessage: "数据库连接不存在",
      });
    }

    // 删除连接
    await db.run("DELETE FROM db_conns WHERE id = ?", [id]);

    // 删除相关的连接日志
    await db.run("DELETE FROM db_connection_logs WHERE connection_id = ?", [id]);
    
    return {
      success: true,
      message: "数据库连接已删除",
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
