/**
 * 数据库连接诊断API
 * 用于诊断和测试数据库连接问题
 */
import { defineEventHandler, readBody, createError } from "h3";
import { diagnoseConnection } from "~/server/utils/mysql-connection-test";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    // 验证必填字段
    if (!body.db_conn) {
      throw createError({
        statusCode: 400,
        statusMessage: "缺少必要字段: db_conn",
      });
    }
    
    // 执行连接诊断
    const result = await diagnoseConnection(body.db_conn);
    
    return {
      success: true,
      message: "诊断完成",
      result
    };
  } catch (error: any) {
    console.error("诊断失败:", error);
    
    throw createError({
      statusCode: 500,
      statusMessage: `诊断失败: ${error.message || "未知错误"}`,
    });
  }
});
