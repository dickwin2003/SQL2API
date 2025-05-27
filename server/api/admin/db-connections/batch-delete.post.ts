import { defineEventHandler, readBody, createError } from "h3";
import db from "../../../utils/db";

/**
 * 批量删除数据库连接配置
 * 
 * 请求体参数:
 * @param {number[]} ids - 要删除的连接ID数组
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const body = await readBody(event);
    
    // 验证请求体
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "请提供要删除的连接ID数组",
      });
    }

    // 转换为数字数组并过滤无效值
    const ids = body.ids
      .map((id: any) => Number(id))
      .filter((id: number) => !isNaN(id) && id > 0);

    if (ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "没有有效的连接ID",
      });
    }

    // 准备参数占位符
    const placeholders = ids.map(() => "?").join(",");

    // 删除连接
    const result = await db.run(
      `DELETE FROM db_conns WHERE id IN (${placeholders})`,
      ids
    );

    // 删除相关的连接日志
    await db.run(
      `DELETE FROM db_connection_logs WHERE connection_id IN (${placeholders})`,
      ids
    );
    
    return {
      success: true,
      message: `已删除 ${result.changes} 个数据库连接`,
      deletedCount: result.changes,
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
