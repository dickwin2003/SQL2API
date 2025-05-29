/**
 * MySQL Connection Test Utility
 * 用于测试和诊断MySQL连接问题
 */
import mysql from 'mysql2/promise';

interface ConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  connectTimeout?: number;
  [key: string]: any;
}

/**
 * 测试MySQL连接
 * @param options 连接选项
 */
export async function testMySqlConnection(options: ConnectionOptions): Promise<void> {
  console.log('尝试连接到MySQL服务器:', {
    host: options.host,
    port: options.port,
    user: options.user,
    database: options.database,
    ...options
  });

  try {
    const conn = await mysql.createConnection(options);
    console.log('连接成功!');
    
    // 获取连接信息
    const [rows] = await conn.execute('SELECT USER(), CURRENT_USER(), @@hostname, DATABASE()');
    console.log('连接信息:', rows);
    
    // 如果有数据库，尝试查询表
    if (options.database) {
      const [tables] = await conn.execute('SHOW TABLES');
      console.log(`数据库 ${options.database} 中的表:`, tables);
    }
    
    await conn.end();
    console.log('连接已关闭');
    return;
  } catch (error: any) {
    console.error('连接失败:', error.message);
    
    // 尝试分析错误
    if (error.message.includes('Access denied')) {
      console.error('用户名或密码错误，或者用户没有从当前主机连接的权限');
      console.error('可以尝试在MySQL中执行以下命令来允许从任何主机连接:');
      console.error(`CREATE USER '${options.user}'@'%' IDENTIFIED BY 'your_password';`);
      console.error(`GRANT ALL PRIVILEGES ON *.* TO '${options.user}'@'%';`);
      console.error('FLUSH PRIVILEGES;');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('无法连接到MySQL服务器，请检查主机名和端口是否正确，以及MySQL服务是否正在运行');
    } else if (error.message.includes('ER_BAD_DB_ERROR')) {
      console.error('数据库不存在');
    }
    
    throw error;
  }
}

/**
 * 尝试多种连接方式
 */
export async function tryMultipleConnections(options: ConnectionOptions): Promise<void> {
  const hosts = [
    options.host,
    'localhost',
    '127.0.0.1',
    'host.docker.internal',
    'mysql',
    'db'
  ];
  
  for (const host of hosts) {
    try {
      console.log(`\n尝试连接到主机: ${host}`);
      await testMySqlConnection({
        ...options,
        host
      });
      console.log(`成功连接到主机: ${host}`);
      return;
    } catch (error) {
      console.error(`连接到主机 ${host} 失败`);
    }
  }
  
  console.error('所有连接尝试均失败');
}

// 导出一个函数，用于从API路由调用
export async function diagnoseConnection(dbConn: any): Promise<any> {
  try {
    console.log('开始诊断MySQL连接...');
    
    const options = {
      host: dbConn.host,
      port: dbConn.port,
      user: dbConn.username,
      password: dbConn.password,
      database: dbConn.database_name,
      connectTimeout: 10000,
      multipleStatements: true,
      ssl: false,
      insecureAuth: true
    };
    
    await tryMultipleConnections(options);
    
    return {
      success: true,
      message: '诊断完成，请查看服务器日志'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `诊断失败: ${error.message}`,
      error: error
    };
  }
}
