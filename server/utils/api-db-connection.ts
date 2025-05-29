/**
 * API Database Connection Utility
 * 用于API路由执行数据库查询的工具函数
 */
import mysql from 'mysql2/promise';
import pg from 'pg';
import { Connection, Request, TYPES } from 'tedious';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { getDbConnFromEnv } from './db-connection';
import path from 'path';
import fs from 'fs';
// 如果需要SSH隧道功能，请安装并导入这些包
// import { Client } from 'ssh2';
// import net from 'net';

// MySQL连接池缓存
// 使用Map存储不同数据库的连接池，键为“host:port:database”
// 这样可以避免频繁创建和关闭连接
// 注意：在生产环境中，可能需要定期清理连接池或实现更复杂的连接池管理
// 这里使用简单的实现方式仅用于演示

const mysqlPools = new Map<string, mysql.Pool>();

// 数据库连接信息接口
interface DbConnInfo {
  host: string;
  port: number;
  username: string;
  password: string;
  database_name: string;
  db_type: string;
  connection_string?: string;
}

/**
 * 执行MySQL查询 - API版本
 * @param dbConn 数据库连接信息
 * @param sqlQuery SQL查询语句
 * @param params 查询参数
 * @returns 查询结果
 */
export async function executeApiMySqlQuery(dbConn: DbConnInfo, sqlQuery: string, params: any[] = []) {
  try {
    // 打印详细的连接信息用于调试
    console.log('尝试连接MySQL数据库:', {
      host: dbConn.host,
      port: dbConn.port,
      user: dbConn.username,
      database: dbConn.database_name,
      // 不打印密码
    });
    
    // 获取本机网络信息用于调试
    console.log('当前应用运行环境:', {
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      arch: process.arch
    });
    
    // 生成连接池的唯一键
    const poolKey = `${dbConn.host}:${dbConn.port}:${dbConn.database_name}`;
    
    // 检查是否已经有连接池
    let pool = mysqlPools.get(poolKey);
    
    if (!pool) {
      console.log('创建新的MySQL连接池:', poolKey);
      
      // 创建新的连接池
      pool = mysql.createPool({
        host: dbConn.host,
        port: dbConn.port,
        user: dbConn.username,
        password: dbConn.password,
        database: dbConn.database_name,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        // 增加连接超时时间
        connectTimeout: 10000,
        // 增加重试选项
        maxRetries: 3,
        // 尝试解决“Access denied”问与密码相关的问题
        ssl: {
          // 如果服务器支持SSL，可以尝试启用
          rejectUnauthorized: false
        }
      });
      
      // 将连接池添加到缓存
      mysqlPools.set(poolKey, pool);
      
      // 添加错误处理
      pool.on('error', (err) => {
        console.error('连接池错误:', err);
        // 如果连接池出错，从缓存中移除
        mysqlPools.delete(poolKey);
      });
    } else {
      console.log('使用现有的MySQL连接池:', poolKey);
    }
    
    // 从连接池获取连接
    console.log('从连接池获取连接...');
    const connection = await pool.getConnection();
    console.log('MySQL连接成功！');
    
    try {
      // 执行查询
      console.log('执行SQL查询:', sqlQuery);
      console.log('查询参数:', params);
      
      const [rows] = await connection.execute(sqlQuery, params);
      console.log('查询成功，返回行数:', Array.isArray(rows) ? rows.length : 1);
      
      return rows;
    } finally {
      // 将连接返回到连接池，而不是关闭它
      connection.release();
      console.log('连接已返回到连接池');
    }
  } catch (error) {
    console.error('MySQL查询执行错误:', error);
    // 打印更多错误信息
    if (error.code) {
      console.error('错误代码:', error.code);
    }
    if (error.errno) {
      console.error('错误号:', error.errno);
    }
    if (error.sqlState) {
      console.error('SQL状态:', error.sqlState);
    }
    if (error.sqlMessage) {
      console.error('SQL错误消息:', error.sqlMessage);
    }
    
    throw new Error(`MySQL查询执行错误: ${error.message}`);
  }
}

/**
 * 执行PostgreSQL查询 - API版本
 * @param dbConn 数据库连接信息
 * @param sqlQuery SQL查询语句
 * @param params 查询参数
 * @returns 查询结果
 */
export async function executeApiPostgreSqlQuery(dbConn: DbConnInfo, sqlQuery: string, params: any[] = []) {
  try {
    // 创建PostgreSQL客户端
    const client = new pg.Client({
      host: dbConn.host,
      port: dbConn.port,
      user: dbConn.username,
      password: dbConn.password,
      database: dbConn.database_name
    });
    
    // 连接数据库
    await client.connect();
    
    // 执行查询
    const result = await client.query(sqlQuery, params);
    
    // 关闭连接
    await client.end();
    
    return result.rows;
  } catch (error) {
    console.error('PostgreSQL查询执行错误:', error);
    throw new Error(`PostgreSQL查询执行错误: ${error.message}`);
  }
}

/**
 * 执行SQL Server查询 - API版本
 * @param dbConn 数据库连接信息
 * @param sqlQuery SQL查询语句
 * @param params 查询参数
 * @returns 查询结果
 */
export async function executeApiSqlServerQuery(dbConn: DbConnInfo, sqlQuery: string, params: any[] = []) {
  return new Promise((resolve, reject) => {
    try {
      // 配置SQL Server连接
      const config = {
        server: dbConn.host,
        authentication: {
          type: 'default',
          options: {
            userName: dbConn.username,
            password: dbConn.password
          }
        },
        options: {
          port: dbConn.port,
          database: dbConn.database_name,
          trustServerCertificate: true
        }
      };
      
      // 创建连接
      const connection = new Connection(config);
      const rows: any[] = [];
      
      // 连接事件处理
      connection.on('connect', (err) => {
        if (err) {
          reject(new Error(`SQL Server连接错误: ${err.message}`));
          return;
        }
        
        // 创建请求
        const request = new Request(sqlQuery, (err, rowCount) => {
          if (err) {
            reject(new Error(`SQL Server查询错误: ${err.message}`));
            return;
          }
          connection.close();
          resolve(rows);
        });
        
        // 添加参数
        params.forEach((param, index) => {
          request.addParameter(`param${index}`, TYPES.VarChar, param);
        });
        
        // 处理行数据
        request.on('row', (columns) => {
          const row: Record<string, any> = {};
          columns.forEach((column) => {
            row[column.metadata.colName] = column.value;
          });
          rows.push(row);
        });
        
        // 执行请求
        connection.execSql(request);
      });
      
      // 连接错误处理
      connection.on('error', (err) => {
        reject(new Error(`SQL Server连接错误: ${err.message}`));
      });
      
      // 开始连接
      connection.connect();
    } catch (error) {
      console.error('SQL Server查询执行错误:', error);
      reject(new Error(`SQL Server查询执行错误: ${error.message}`));
    }
  });
}

/**
 * 执行SQLite查询 - API版本
 * @param dbConn 数据库连接信息
 * @param sqlQuery SQL查询语句
 * @param params 查询参数
 * @returns 查询结果
 */
export async function executeApiSqliteQuery(dbConn: DbConnInfo, sqlQuery: string, params: any[] = []) {
  return new Promise((resolve, reject) => {
    try {
      // 创建SQLite数据库连接
      const dbPath = dbConn.connection_string || path.join(process.cwd(), 'data', `${dbConn.database_name}.db`);
      
      // 确保目录存在
      const dirPath = path.dirname(dbPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 创建数据库连接
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(new Error(`SQLite连接错误: ${err.message}`));
          return;
        }
        
        // 启用外键约束
        db.run('PRAGMA foreign_keys = ON');
        
        // 判断是否为查询操作
        const isSelect = sqlQuery.trim().toLowerCase().startsWith('select');
        
        if (isSelect) {
          // 查询操作
          db.all(sqlQuery, params, (err, rows) => {
            if (err) {
              reject(new Error(`SQLite查询错误: ${err.message}`));
              return;
            }
            
            // 关闭数据库连接
            db.close();
            
            resolve({ rows });
          });
        } else {
          // 更新操作
          db.run(sqlQuery, params, function(err) {
            if (err) {
              reject(new Error(`SQLite更新错误: ${err.message}`));
              return;
            }
            
            // 关闭数据库连接
            db.close();
            
            resolve({ 
              rows: [{ 
                changes: this.changes, 
                lastInsertRowid: this.lastID 
              }] 
            });
          });
        }
      });
    } catch (error) {
      console.error('SQLite查询执行错误:', error);
      reject(new Error(`SQLite查询执行错误: ${error.message}`));
    }
  });
}
