import { defineEventHandler, readBody, createError } from "h3";
import db from "../../utils/db";

/**
 * 创建新的数据库连接配置
 *
 * 请求体参数:
 * @param {string} name - 连接名称
 * @param {string} host - 主机地址
 * @param {number} port - 端口号
 * @param {string} username - 用户名
 * @param {string} password - 密码
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
    const body = await readBody(event);

    // 验证必填字段
    const requiredFields = ['name', 'host', 'port', 'username', 'password', 'database_name', 'db_type'];
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

    // 保存到数据库
    try {
      const result = await db.run(
        `
        INSERT INTO db_conns (
          name, host, port, username, password, 
          database_name, db_type, is_active,
          connection_string, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          body.name,
          body.host,
          Number(body.port),
          body.username,
          body.password,
          body.database_name,
          body.db_type.toLowerCase(),
          body.is_active === false ? 0 : 1,
          body.connection_string || null,
          body.notes || null
        ]
      );

      // 获取创建的连接ID
      const newConnectionId = result.lastID;
      
      return {
        success: true,
        message: "数据库连接配置创建成功",
        id: newConnectionId,
        name: body.name,
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
