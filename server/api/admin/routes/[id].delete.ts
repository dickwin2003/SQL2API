import { defineEventHandler, getRouterParam, createError } from "h3";
import db from "~/server/utils/db";

/**
 * 删除API路由
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

    // 使用本地数据库实例而不是Cloudflare环境

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

    // 删除API路由
    const result = await db.run(
      `DELETE FROM api_routes WHERE id = ?`,
      [id]
    );

    if (!result || result.changes === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: `删除失败: 未能删除API路由`,
      });
    }

    // 清理相关的日志记录
    await db.run(
      `DELETE FROM api_logs WHERE route_id = ?`,
      [id]
    );

    return {
      success: true,
      message: "API路由已删除",
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
