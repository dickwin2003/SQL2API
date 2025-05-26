const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Ensure process.env exists
process.env = process.env || {};

// 数据库文件路径
const dbPath = path.join(process.cwd(), 'data', 'meta.db');

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
  console.error('数据库文件不存在，请先运行 init-db.cjs');
  process.exit(1);
}

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// 测试查询函数
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// 执行测试查询
async function testDatabase() {
  try {
    console.log('Testing database queries...');
    
    // 1. 测试查询用户表
    const users = await runQuery('SELECT * FROM users LIMIT 5');
    console.log('Users:', JSON.stringify(users, null, 2));
    
    // 2. 测试查询API路由表
    const routes = await runQuery('SELECT id, name, path, method FROM api_routes LIMIT 5');
    console.log('API Routes:', JSON.stringify(routes, null, 2));
    
    // 3. 测试查询产品表
    const products = await runQuery('SELECT * FROM products LIMIT 5');
    console.log('Products:', JSON.stringify(products, null, 2));
    
    console.log('All tests completed successfully');
    db.close();
  } catch (error) {
    console.error('Error testing database:', error);
    db.close();
    process.exit(1);
  }
}

// 运行测试
testDatabase();
