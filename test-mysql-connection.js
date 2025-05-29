// 简单的MySQL连接测试脚本
import mysql from 'mysql2/promise';

async function testConnection() {
  console.log('开始测试MySQL连接...');
  
  // 连接配置
  const config = {
    host: '139.196.78.195',
    port: 3306,
    user: 'ppg',
    password: 'dickwin2003@gmail.com', // 请替换为实际密码
    database: 'stock_pick', // 请替换为实际数据库名
    connectTimeout: 10000
  };
  
  try {
    // 添加更多连接选项用于远程连接
    const extendedConfig = {
      ...config,
      ssl: false,           // 如果服务器不需要SSL
      insecureAuth: true,   // 允许不安全的认证
      multipleStatements: false  // 禁用多语句查询以提高安全性
    };
    
    console.log('尝试连接到MySQL:', extendedConfig);
    const connection = await mysql.createConnection(extendedConfig);
    console.log('连接成功!');
    
    // 获取连接信息
    const [rows] = await connection.execute('SELECT USER(), CURRENT_USER()');
    console.log('连接信息:', rows);
    
    // 查询版本
    const [versionRows] = await connection.execute('SELECT VERSION() as version');
    console.log('MySQL版本:', versionRows[0].version);
    
    // 关闭连接
    await connection.end();
    console.log('测试完成，连接已关闭');
  } catch (error) {
    console.error('连接失败:', error.message);
    
    if (error.message.includes('Access denied')) {
      console.error('用户名或密码错误，或者用户没有从当前主机连接的权限');
      console.error('请检查MySQL用户权限，确保root用户可以从任何主机连接');
    }
  }
}

testConnection();
