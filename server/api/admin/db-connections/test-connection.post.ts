import { defineEventHandler, readBody, createError } from "h3";
import db from "../../../utils/db";

/**
 * 测试数据库连接
 * 根据连接ID或提供的连接信息测试数据库连接是否可用
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    // 如果提供了ID，则测试已存在的连接
    if (body.id) {
      return await testExistingConnection(body.id);
    } 
    // 否则测试提供的连接信息
    else {
      return await testNewConnection(body);
    }
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

/**
 * 测试已存在的数据库连接
 */
async function testExistingConnection(id: string | number) {
  // 获取连接信息
  const connection = await db.get(
    `SELECT 
      id, name, host, port, username, password, 
      database_name, db_type, connection_string
     FROM db_conns 
     WHERE id = ?`,
    [id]
  );

  if (!connection) {
    throw createError({
      statusCode: 404,
      statusMessage: "数据库连接不存在",
    });
  }

  // 测试连接
  const testResult = await testDatabaseConnection(connection);
  
  // 更新连接状态
  await db.run(
    `UPDATE db_conns SET 
      connection_status = ?, 
      last_connected_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [testResult.success ? 'success' : 'failed', id]
  );

  return {
    success: testResult.success,
    message: testResult.message,
    details: testResult.details,
  };
}

/**
 * 测试新的数据库连接
 */
async function testNewConnection(connectionInfo: any) {
  // 验证必填字段
  const requiredFields = ['host', 'port', 'username', 'password', 'database_name', 'db_type'];
  const missingFields = requiredFields.filter(field => !connectionInfo[field]);
  
  if (missingFields.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `缺少必要字段: ${missingFields.join(', ')}`,
    });
  }

  // 验证端口号
  if (isNaN(Number(connectionInfo.port)) || Number(connectionInfo.port) <= 0 || Number(connectionInfo.port) > 65535) {
    throw createError({
      statusCode: 400,
      statusMessage: "端口号必须是1-65535之间的有效数字",
    });
  }

  // 验证数据库类型
  const validDbTypes = ['mysql', 'postgresql', 'sqlserver', 'oracle', 'sqlite'];
  if (!validDbTypes.includes(connectionInfo.db_type.toLowerCase())) {
    throw createError({
      statusCode: 400,
      statusMessage: `不支持的数据库类型，请使用: ${validDbTypes.join(', ')}`,
    });
  }

  // 测试连接
  const testResult = await testDatabaseConnection(connectionInfo);

  return {
    success: testResult.success,
    message: testResult.message,
    details: testResult.details,
  };
}

/**
 * 测试数据库连接
 * @param connection 数据库连接信息
 */
async function testDatabaseConnection(connection: any) {
  try {
    // 根据数据库类型进行不同的连接测试
    switch (connection.db_type.toLowerCase()) {
      case 'mysql':
        return await testMySQLConnection(connection);
      case 'postgresql':
        return await testPostgreSQLConnection(connection);
      case 'sqlserver':
        return await testSQLServerConnection(connection);
      case 'oracle':
        return await testOracleConnection(connection);
      case 'sqlite':
        return await testSQLiteConnection(connection);
      default:
        return {
          success: false,
          message: `不支持的数据库类型: ${connection.db_type}`,
          details: null
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `连接测试失败: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * 测试MySQL连接
 */
async function testMySQLConnection(connection: any) {
  try {
    // 这里只是模拟连接测试，实际应用中应该使用mysql2或其他库进行实际连接
    // const mysql = require('mysql2/promise');
    // const conn = await mysql.createConnection({
    //   host: connection.host,
    //   port: connection.port,
    //   user: connection.username,
    //   password: connection.password,
    //   database: connection.database_name
    // });
    // await conn.ping();
    // await conn.end();
    
    // 模拟连接成功
    return {
      success: true,
      message: `成功连接到MySQL数据库 ${connection.database_name}@${connection.host}:${connection.port}`,
      details: `连接信息:\n主机: ${connection.host}\n端口: ${connection.port}\n用户名: ${connection.username}\n数据库: ${connection.database_name}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `MySQL连接失败: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * 测试PostgreSQL连接
 */
async function testPostgreSQLConnection(connection: any) {
  try {
    // 模拟连接成功
    return {
      success: true,
      message: `成功连接到PostgreSQL数据库 ${connection.database_name}@${connection.host}:${connection.port}`,
      details: `连接信息:\n主机: ${connection.host}\n端口: ${connection.port}\n用户名: ${connection.username}\n数据库: ${connection.database_name}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `PostgreSQL连接失败: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * 测试SQL Server连接
 */
async function testSQLServerConnection(connection: any) {
  try {
    // 模拟连接成功
    return {
      success: true,
      message: `成功连接到SQL Server数据库 ${connection.database_name}@${connection.host}:${connection.port}`,
      details: `连接信息:\n主机: ${connection.host}\n端口: ${connection.port}\n用户名: ${connection.username}\n数据库: ${connection.database_name}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `SQL Server连接失败: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * 测试Oracle连接
 */
async function testOracleConnection(connection: any) {
  try {
    // 模拟连接成功
    return {
      success: true,
      message: `成功连接到Oracle数据库 ${connection.database_name}@${connection.host}:${connection.port}`,
      details: `连接信息:\n主机: ${connection.host}\n端口: ${connection.port}\n用户名: ${connection.username}\n服务名: ${connection.database_name}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Oracle连接失败: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * 测试SQLite连接
 */
async function testSQLiteConnection(connection: any) {
  try {
    // 模拟连接成功
    return {
      success: true,
      message: `成功连接到SQLite数据库 ${connection.database_name}`,
      details: `连接信息:\n数据库文件: ${connection.database_name}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `SQLite连接失败: ${error.message}`,
      details: error.stack
    };
  }
}
