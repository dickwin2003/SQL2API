const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 数据库文件路径
const dbPath = path.join(process.cwd(), 'data', 'data.db');

// 确保data目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// 启用外键约束
db.run('PRAGMA foreign_keys = ON');

// 读取并执行迁移脚本
function initializeDatabase() {
  try {
    // 读取迁移脚本目录
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    // 开始事务
    db.run('BEGIN TRANSACTION', function(err) {
      if (err) {
        console.error('Error starting transaction:', err);
        return;
      }

      let currentFileIndex = 0;

      function processNextFile() {
        if (currentFileIndex >= migrationFiles.length) {
          // 所有文件处理完毕，提交事务
          db.run('COMMIT', function(err) {
            if (err) {
              console.error('Error committing transaction:', err);
              db.run('ROLLBACK');
            } else {
              console.log('Database initialization completed successfully');
            }
            db.close();
          });
          return;
        }

        const file = migrationFiles[currentFileIndex];
        if (!file.endsWith('.sql')) {
          currentFileIndex++;
          processNextFile();
          return;
        }

        console.log(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // 将SQL语句分割成单独的语句
        const statements = sql
          .split(';')
          .map(statement => statement.trim())
          .filter(statement => statement.length > 0);

        let statementIndex = 0;

        function executeNextStatement() {
          if (statementIndex >= statements.length) {
            console.log(`Migration ${file} completed successfully`);
            currentFileIndex++;
            processNextFile();
            return;
          }

          const statement = statements[statementIndex];
          db.run(statement, function(err) {
            if (err) {
              console.error(`Error executing statement in ${file}:`, err);
              console.error('Statement:', statement);
              db.run('ROLLBACK', function() {
                db.close();
                process.exit(1);
              });
              return;
            }
            statementIndex++;
            executeNextStatement();
          });
        }

        executeNextStatement();
      }

      processNextFile();
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    db.run('ROLLBACK', function() {
      db.close();
      process.exit(1);
    });
  }
}

// 运行初始化
initializeDatabase();
