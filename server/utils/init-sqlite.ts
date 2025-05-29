import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 初始化 SQLite 数据库
 */
export function initSqliteDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // 确保 data 目录存在
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const dbPath = path.join(dataDir, 'meta.db');

      // 初始化数据库
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Failed to connect to database:', err);
          reject(err);
          return;
        }
      });

      // 创建数据库连接表
      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS db_connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            database_name TEXT NOT NULL,
            db_type TEXT NOT NULL,
            connection_string TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating table:', err);
            reject(err);
            return;
          }
        });

        // 创建触发器以自动更新 updated_at
        db.run(`
          CREATE TRIGGER IF NOT EXISTS update_db_connections_timestamp 
          AFTER UPDATE ON db_connections
          BEGIN
            UPDATE db_connections SET updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.id;
          END
        `, (err) => {
          if (err) {
            console.error('Error creating trigger:', err);
            reject(err);
            return;
          }
          console.log('SQLite 数据库初始化完成');
          resolve();
        });
      });
    } catch (error) {
      console.error('初始化 SQLite 数据库失败:', error);
      reject(error);
    }
  });
}