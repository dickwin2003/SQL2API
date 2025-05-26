import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

class Database {
  private static instance: Database;
  private db: sqlite3.Database;
  private dbPath: string;

  private constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'meta.db');
    
    // 确保data目录存在
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 创建数据库连接
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Could not connect to database', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });

    // 启用外键约束
    this.db.run('PRAGMA foreign_keys = ON');
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // 执行查询并返回所有结果
  public async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 执行查询并返回第一行结果
  public async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 执行更新操作（INSERT, UPDATE, DELETE）
  public async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  // 执行事务
  public async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.db.serialize(async () => {
        try {
          await this.run('BEGIN TRANSACTION');
          const result = await callback();
          await this.run('COMMIT');
          resolve(result);
        } catch (error) {
          await this.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  // 关闭数据库连接
  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

export default Database.getInstance();
