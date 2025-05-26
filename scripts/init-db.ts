import fs from 'fs';
import path from 'path';
import db from '../server/utils/db';

async function initializeDatabase() {
  try {
    // 读取并执行迁移脚本
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        console.log(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // 将SQL语句分割成单独的语句
        const statements = sql
          .split(';')
          .map(statement => statement.trim())
          .filter(statement => statement.length > 0);

        // 在事务中执行所有语句
        await db.transaction(async () => {
          for (const statement of statements) {
            await db.run(statement);
          }
        });

        console.log(`Migration ${file} completed successfully`);
      }
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// 运行初始化
initializeDatabase();
