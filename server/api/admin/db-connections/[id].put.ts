import { defineEventHandler, readBody, createError, getRouterParam } from "h3";
import db from "../../../utils/db";

/**
 * 更新数据库连接配置
 *
 * 请求体参数:
 * @param {string} name - 连接名称
 * @param {string} host - 主机地址
 * @param {number} port - 端口号
 * @param {string} username - 用户名
 * @param {string} password - 密码 (可选，如果不提供则不更新)
 * @param {string} database_name - 数据库名称
 * @param {string} db_type - 数据库类型 (mysql, postgresql, sqlserver等)
 * @param {boolean} is_active - 是否激活
 * @param {string} connection_string - 连接字符串 (可选)
 * @param {string} notes - 备注 (可选)
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

    const body = await readBody(event);

    // 验证必填字段
    const requiredFields = ['name', 'host', 'port', 'username', 'database_name', 'db_type'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `缺少必要字段: ${missingFields.join(', ')}`,
      });
    }

    // 验证端口号
    if (isNaN(Number(body.port)) || Number(body.port) <= 0 || Number(body.port) > 65535) {
      throw createError({
        statusCode: 400,
        statusMessage: "端口号必须是1-65535之间的有效数字",
      });
    }

    // 验证数据库类型
    const validDbTypes = ['mysql', 'postgresql', 'sqlserver', 'oracle', 'sqlite'];
    if (!validDbTypes.includes(body.db_type.toLowerCase())) {
      throw createError({
        statusCode: 400,
        statusMessage: `不支持的数据库类型，请使用: ${validDbTypes.join(', ')}`,
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

    // 构建更新SQL
    let updateSql = `
      UPDATE db_conns SET
        name = ?,
        host = ?,
        port = ?,
        username = ?,
        database_name = ?,
        db_type = ?,
        is_active = ?,
        connection_string = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
    `;

    const params = [
      body.name,
      body.host,
      Number(body.port),
      body.username,
      body.database_name,
      body.db_type.toLowerCase(),
      body.is_active === false ? 0 : 1,
      body.connection_string || null,
      body.notes || null,
    ];

    // 如果提供了密码，则更新密码
    if (body.password) {
      updateSql += `, password = ?`;
      params.push(body.password);
    }

    updateSql += ` WHERE id = ?`;
    params.push(id);

    // 保存到数据库
    try {
      await db.run(updateSql, params);
      
      return {
        success: true,
        message: "数据库连接配置更新成功",
        id: id,
      };
    } catch (dbError) {
      // 处理数据库错误
      throw createError({
        statusCode: 500,
        statusMessage: `数据库错误: ${dbError.message || "未知错误"}`,
      });
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    // 唯一性约束冲突错误
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      throw createError({
        statusCode: 409,
        statusMessage: "该连接名称已存在",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: `服务器错误: ${error.message || "未知错误"}`,
    });
  }
});
