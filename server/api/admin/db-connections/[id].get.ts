import { defineEventHandler, getRouterParam, createError } from "h3";
import { getDbConnById } from "../../../utils/db-manager";

/**
 * 获取特定数据库连接详情
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const id = getRouterParam(event, "id");

    if (!id || isNaN(Number(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: "数据库连接ID无效",
      });
    }

    const dbConn = await getDbConnById(Number(id));

    if (!dbConn) {
      throw createError({
        statusCode: 404,
        statusMessage: "数据库连接不存在",
      });
    }

    // 返回数据库连接信息，但隐藏敏感信息
    return {
      success: true,
      connection: {
        ...dbConn,
        // 返回带掩码的密码，防止密码泄露
        password: dbConn.password ? "********" : "",
      },
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
