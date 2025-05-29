// Docker MySQL连接测试脚本
import mysql from 'mysql2/promise';

async function testDockerConnection() {
  console.log('开始测试Docker MySQL连接...');
  
  // 尝试的主机列表
  const hosts = [
    '127.0.0.1',
    'localhost',
    'host.docker.internal',  // Docker特殊主机名，用于从容器访问宿主机
    '172.17.0.1',            // Docker默认网桥IP
    'mysql',                 // 常用的Docker容器名
    'db'                     // 另一个常用的Docker容器名
  ];
  
  const baseConfig = {
    port: 3306,
    user: 'root',
    password: 'root',        // 替换为实际密码
    database: 'sqlrest',     // 替换为实际数据库名
    connectTimeout: 5000     // 较短的超时以加快测试
  };
  
  // 尝试每个主机
  for (const host of hosts) {
    try {
      const config = {
        ...baseConfig,
        host: host
      };
      
      console.log(`\n尝试连接到主机: ${host}`);
      const connection = await mysql.createConnection(config);
      
      console.log(`成功连接到主机: ${host}`);
      
      // 获取连接信息
      const [rows] = await connection.execute('SELECT USER(), CURRENT_USER()');
      console.log('连接信息:', rows);
      
      // 查询版本
      const [versionRows] = await connection.execute('SELECT VERSION() as version');
      console.log('MySQL版本:', versionRows[0].version);
      
      // 关闭连接
      await connection.end();
      console.log(`与主机 ${host} 的连接已关闭`);
      
      // 如果成功，记录下来
      console.log(`\n成功连接配置:`);
      console.log(JSON.stringify(config, null, 2));
      
      return; // 找到一个可用连接后退出
    } catch (error) {
      console.error(`连接到主机 ${host} 失败:`, error.message);
    }
  }
  
  console.error('\n所有连接尝试均失败');
}

testDockerConnection();
