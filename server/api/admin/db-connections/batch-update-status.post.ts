import { defineEventHandler, readBody, createError } from "h3";
import db from "../../../utils/db";

/**
 * 批量更新数据库连接状态
 * 
 * 请求体参数:
 * @param {number[]} ids - 要更新的连接ID数组
 * @param {boolean} is_active - 要设置的状态值
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
        statusMessage: "请提供要更新的连接ID数组",
      });
    }

    if (body.is_active === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: "请提供要设置的状态值",
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
    
    // 更新连接状态
    const result = await db.run(
      `UPDATE db_conns 
       SET is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders})`,
      [body.is_active ? 1 : 0, ...ids]
    );
    
    return {
      success: true,
      message: `已更新 ${result.changes} 个数据库连接的状态`,
      updatedCount: result.changes,
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
