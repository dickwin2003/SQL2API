// 检查 db_conns 表内容的脚本
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 连接到数据库
const dbPath = path.join(path.resolve(__dirname, '..'), 'data', 'meta.db');
console.log('数据库路径:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('无法连接到数据库:', err.message);
    process.exit(1);
  }
  console.log('已连接到 meta.db 数据库');
});

// 查询 db_conns 表
db.all('SELECT * FROM db_conns', [], (err, rows) => {
  if (err) {
    console.error('查询失败:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('db_conns 表内容:');
  console.log(JSON.stringify(rows, null, 2));
  
  // 关闭数据库连接
  db.close(() => {
    console.log('数据库连接已关闭');
  });
});
