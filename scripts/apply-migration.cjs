const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 确保process.env存在
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

// 执行SQL文件
function executeSqlFile(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`执行SQL文件: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // 启用外键约束
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // 开始事务
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // 执行SQL语句
        db.exec(sql, (err) => {
          if (err) {
            // 如果出错，回滚事务
            db.run('ROLLBACK', () => {
              reject(err);
            });
            return;
          }
          
          // 提交事务
          db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      });
    });
  });
}

// 获取迁移文件参数
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('请指定迁移文件名，例如: node scripts/apply-migration.cjs migrations/0001_db_connections.sql');
  process.exit(1);
}

const migrationPath = path.resolve(process.cwd(), migrationFile);
if (!fs.existsSync(migrationPath)) {
  console.error(`迁移文件不存在: ${migrationPath}`);
  process.exit(1);
}

// 执行迁移
executeSqlFile(migrationPath)
  .then(() => {
    console.log('迁移成功完成');
    db.close();
  })
  .catch((err) => {
    console.error('迁移失败:', err);
    db.close();
    process.exit(1);
  });
