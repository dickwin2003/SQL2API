import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 启用详细模式
const sqlite = sqlite3.verbose();

// 数据库文件路径
const dbPath = path.join(process.cwd(), 'data', 'data.db');

// 确保data目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// 启用外键约束
db.run('PRAGMA foreign_keys = ON');

// 读取并执行迁移脚本
async function initializeDatabase() {
  try {
    // 读取迁移脚本目录
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    // 开始事务
    await runQuery('BEGIN TRANSACTION');

    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        console.log(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // 将SQL语句分割成单独的语句
        const statements = sql
          .split(';')
          .map(statement => statement.trim())
          .filter(statement => statement.length > 0);

        // 执行所有语句
        for (const statement of statements) {
          await runQuery(statement);
        }

        console.log(`Migration ${file} completed successfully`);
      }
    }

    // 提交事务
    await runQuery('COMMIT');
    console.log('Database initialization completed successfully');
    
    // 关闭数据库连接
    db.close();
  } catch (error) {
    // 回滚事务
    await runQuery('ROLLBACK');
    console.error('Error initializing database:', error);
    db.close();
    process.exit(1);
  }
}

// 执行SQL查询的辅助函数
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// 运行初始化
initializeDatabase();
