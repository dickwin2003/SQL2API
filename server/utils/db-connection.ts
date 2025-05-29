/**
 * Database Connection Utility
 * 用于连接不同类型的数据库并执行查询
 */
import { H3Event } from 'h3';
import { getDbConnById } from '~/server/utils/db-manager';
import * as oracledb from 'oracledb';
import mysql from 'mysql2/promise';
import pg from 'pg';
import { Connection, Request, TYPES } from 'tedious';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import * as mssql from 'mssql';

// 数据库连接类型
export interface DbConnection {
  id?: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database_name: string;
  db_type: string;
  connection_string?: string;
}

// 测试数据库连接结果
export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * 测试数据库连接
 * @param connection 数据库连接信息
 * @returns 测试结果
 */
export async function testDatabaseConnection(connection: DbConnection): Promise<TestConnectionResult> {
  try {
    // 根据数据库类型选择不同的连接方式
    switch (connection.db_type.toLowerCase()) {
      case 'mysql':
        return await testMySqlConnection(connection);
      case 'postgresql':
        return await testPostgreSqlConnection(connection);
      case 'sqlserver':
        return await testSqlServerConnection(connection);
      case 'oracle':
        return await testOracleConnection(connection);
      case 'sqlite':
        return await testSqliteConnection(connection);
      default:
        return {
          success: false,
          message: `不支持的数据库类型: ${connection.db_type}`
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `连接测试失败: ${error.message}`,
      details: error
    };
  }
}

/**
 * 获取数据库表和视图列表
 * @param connection 数据库连接信息
 * @returns 表和视图列表
 */
export async function getDatabaseTables(connection: DbConnection): Promise<any[]> {
  try {
    // 根据数据库类型选择不同的查询方式
    switch (connection.db_type.toLowerCase()) {
      case 'mysql':
        return await getMySqlTables(connection);
      case 'postgresql':
        return await getPostgreSqlTables(connection);
      case 'sqlserver':
        return await getSqlServerTables(connection);
      case 'oracle':
        return await getOracleTables(connection);
      case 'sqlite':
        return await getSqliteTables(connection);
      default:
        return [];
    }
  } catch (error) {
    console.error(`获取表列表失败:`, error);
    return [];
  }
}

/**
 * 获取表结构信息
 * @param connection 数据库连接信息
 * @param tableName 表名
 * @returns 表结构信息
 */
export async function getTableStructure(connection: DbConnection, tableName: string): Promise<any> {
  try {
    // 根据数据库类型选择不同的查询方式
    switch (connection.db_type.toLowerCase()) {
      case 'mysql':
        return await getMySqlTableStructure(connection, tableName);
      case 'postgresql':
        return await getPostgreSqlTableStructure(connection, tableName);
      case 'sqlserver':
        return await getSqlServerTableStructure(connection, tableName);
      case 'oracle':
        return await getOracleTableStructure(connection, tableName);
      case 'sqlite':
        return await getSqliteTableStructure(connection, tableName);
      default:
        return {
          name: tableName,
          fields: [],
          indexes: []
        };
    }
  } catch (error) {
    console.error(`获取表结构失败:`, error);
    return {
      name: tableName,
      fields: [],
      indexes: []
    };
  }
}

/**
 * 执行SQL查询
 * @param connection 数据库连接信息
 * @param sql SQL语句
 * @param params 参数
 * @returns 查询结果
 */
export async function executeQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<any> {
  try {
    // 根据数据库类型选择不同的查询方式
    switch (connection.db_type.toLowerCase()) {
      case 'mysql':
        return await executeMySqlQuery(connection, sql, params);
      case 'postgresql':
        return await executePostgreSqlQuery(connection, sql, params);
      case 'sqlserver':
        return await executeSqlServerQuery(connection, sql, params);
      case 'oracle':
        return await executeOracleQuery(connection, sql, params);
      case 'sqlite':
        return await executeSqliteQuery(connection, sql, params);
      default:
        throw new Error(`不支持的数据库类型: ${connection.db_type}`);
    }
  } catch (error) {
    console.error(`执行查询失败:`, error);
    throw error;
  }
}

// ==================== MySQL 实现 ====================
/**
 * 测试MySQL连接
 */
async function testMySqlConnection(connection: DbConnection): Promise<TestConnectionResult> {
  let conn;
  try {
    // 创建MySQL连接
    conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name,
      connectTimeout: 10000 // 10秒连接超时
    });
    
    // 测试连接
    const [rows] = await conn.execute('SELECT VERSION() as version');
    const version = Array.isArray(rows) && rows.length > 0 ? (rows[0] as any).version : 'Unknown';
    
    return {
      success: true,
      message: '连接成功',
      details: {
        server: 'MySQL',
        version: version,
        connection_id: (conn as any).connection.connectionId
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `MySQL连接失败: ${error.message}`,
      details: error
    };
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch (e) {
        console.error('Error closing MySQL connection:', e);
      }
    }
  }
}

/**
 * 获取MySQL表和视图列表
 * 兼容MySQL 5.7和MySQL 8.0+版本
 */
  async function getMySqlTables(connection: DbConnection): Promise<Array<{
    name: string;
    type: string;
    rows: number;
    size: string;
    create_time: string;
    comment: string;
  }>> {
  let conn;
  try {
    // 创建MySQL连接
    conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name,
      connectTimeout: 10000 // 10秒连接超时
    });
    
    // 先检查MySQL版本
    const [versionResult] = await conn.execute('SELECT VERSION() as version');
    const mysqlVersion = (versionResult as any[])[0].version;
    console.log(`检测到MySQL版本: ${mysqlVersion}`);
    
    // 根据版本使用不同的查询
    let tablesQuery;
    
    if (mysqlVersion.startsWith('5.')) {
      // MySQL 5.x版本的查询
      tablesQuery = `
        SELECT 
          table_name AS name, 
          'table' AS type,
          0 AS rows,
          0 AS size_kb,
          create_time,
          table_comment AS comment
        FROM 
          information_schema.tables 
        WHERE 
          table_schema = ? 
          AND table_type = 'BASE TABLE'
      `;
      
      // 对于5.x版本，我们需要单独查询每个表的行数
      const [tables] = await conn.execute(tablesQuery, [connection.database_name]);
      
      // 对于每个表，单独查询行数
      for (const table of tables as any[]) {
        try {
          const [rowsResult] = await conn.execute(`SELECT COUNT(*) as count FROM \`${table.name}\``);          
          table.rows = (rowsResult as any[])[0].count || 0;
          
          // 尝试获取表大小
          const [statusResult] = await conn.execute(`SHOW TABLE STATUS LIKE '${table.name}'`);
          if (statusResult && (statusResult as any[]).length > 0) {
            const status = (statusResult as any[])[0];
            const dataLength = status.Data_length || 0;
            const indexLength = status.Index_length || 0;
            table.size_kb = Math.round((dataLength + indexLength) / 1024);
          }
        } catch (tableError) {
          console.warn(`无法获取表 ${table.name} 的行数或大小:`, tableError);
        }
      }
      
      // 获取视图列表
      const [views] = await conn.execute(`
        SELECT 
          table_name AS name, 
          'view' AS type,
          NULL AS rows,
          0 AS size_kb,
          create_time,
          table_comment AS comment
        FROM 
          information_schema.tables 
        WHERE 
          table_schema = ? 
          AND table_type = 'VIEW'
      `, [connection.database_name]);
      
      // 合并表和视图结果
      const result = [...(tables as any[]), ...(views as any[])].map(item => ({
        name: item.name,
        type: item.type,
        rows: item.rows !== null ? item.rows : 0,
        size: item.size_kb ? `${item.size_kb} KB` : '-',
        create_time: item.create_time ? new Date(item.create_time).toISOString() : new Date().toISOString(),
        comment: item.comment || ''
      }));
      
      return result;
    } else {
      // MySQL 8.0+版本的查询
      tablesQuery = `
        SELECT 
          table_name AS name, 
          'table' AS type,
          table_rows AS rows,
          ROUND((data_length + index_length) / 1024) AS size_kb,
          create_time,
          table_comment AS comment
        FROM 
          information_schema.tables 
        WHERE 
          table_schema = ? 
          AND table_type = 'BASE TABLE'
      `;
      
      // 获取表列表
      const [tables] = await conn.execute(tablesQuery, [connection.database_name]);
      
      // 获取视图列表
      const [views] = await conn.execute(`
        SELECT 
          table_name AS name, 
          'view' AS type,
          NULL AS rows,
          0 AS size_kb,
          create_time,
          table_comment AS comment
        FROM 
          information_schema.tables 
        WHERE 
          table_schema = ? 
          AND table_type = 'VIEW'
      `, [connection.database_name]);
      
      // 合并表和视图结果
      const result = [...(tables as any[]), ...(views as any[])].map(item => ({
        name: item.name,
        type: item.type,
        rows: item.rows !== null ? item.rows : 0,
        size: item.size_kb ? `${item.size_kb} KB` : '-',
        create_time: item.create_time ? new Date(item.create_time).toISOString() : new Date().toISOString(),
        comment: item.comment || ''
      }));
      
      return result;
    }
  } catch (error: any) {
    console.error(`获取MySQL表列表失败:`, error);
    return [];
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch (e) {
        console.error('Error closing MySQL connection:', e);
      }
    }
  }
}

/**
 * 获取MySQL表结构
 */
  async function getMySqlTableStructure(connection: DbConnection, tableName: string): Promise<{
    name: string;
    comment: string;
    fields: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default: any;
      primary: boolean;
      comment: string;
      extra: string;
    }>;
    indexes: Array<{
      name: string;
      columns: string[];
      unique: boolean;
    }>;
  }> {
  let conn;
  try {
    // 创建MySQL连接
    conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name,
      connectTimeout: 10000 // 10秒连接超时
    });
    
    // 获取表注释
    const [tableInfo] = await conn.execute(`
      SELECT 
        table_name AS name,
        table_comment AS comment
      FROM 
        information_schema.tables 
      WHERE 
        table_schema = ? 
        AND table_name = ?
    `, [connection.database_name, tableName]);
    
    const tableComment = Array.isArray(tableInfo) && tableInfo.length > 0 ? (tableInfo[0] as any).comment : '';
    
    // 获取字段信息
    const [columns] = await conn.execute(`
      SELECT 
        column_name AS name,
        column_type AS type,
        is_nullable = 'YES' AS nullable,
        column_default AS default_value,
        column_key = 'PRI' AS primary_key,
        column_comment AS comment,
        extra
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = ? 
        AND table_name = ?
      ORDER BY 
        ordinal_position
    `, [connection.database_name, tableName]);
    
    // 获取索引信息
    const [indexInfo] = await conn.execute(`
      SELECT 
        index_name AS name,
        column_name,
        non_unique = 0 AS is_unique
      FROM 
        information_schema.statistics 
      WHERE 
        table_schema = ? 
        AND table_name = ?
      ORDER BY 
        index_name, seq_in_index
    `, [connection.database_name, tableName]);
    
    // 处理索引信息
    const indexMap = new Map();
    (indexInfo as Array<{name: string; column_name: string; is_unique: boolean}>).forEach(idx => {
      if (!indexMap.has(idx.name)) {
        indexMap.set(idx.name, {
          name: idx.name,
          columns: [],
          unique: idx.is_unique
        });
      }
      indexMap.get(idx.name).columns.push(idx.column_name);
    });
    
    // 构建返回结果
    return {
      name: tableName,
      comment: tableComment,
      fields: (columns as any[]).map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        default: col.default_value,
        primary: col.primary_key,
        comment: col.comment || '',
        extra: col.extra || ''
      })),
      indexes: Array.from(indexMap.values())
    };
  } catch (error: any) {
    console.error(`获取MySQL表结构失败:`, error);
    return {
      name: tableName,
      comment: '',
      fields: [],
      indexes: []
    };
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch (e) {
        console.error('Error closing MySQL connection:', e);
      }
    }
  }
}

/**
 * 执行MySQL查询
 */
  export async function executeMySqlQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<{
    fields: string[];
    rows: any[];
    rowCount: number;
    sql: string;
  }> {
  let conn;
  try {
    // 创建MySQL连接
    conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name,
      connectTimeout: 10000 // 10秒连接超时
    });
    
    // 执行查询
    const [rows, fields] = await conn.execute(sql, params);
    
    // 处理字段信息
    const fieldNames = fields ? (fields as any[]).map(f => f.name) : [];
    
    return {
      fields: fieldNames,
      rows: rows as any[],
      rowCount: (rows as any[]).length,
      sql: sql
    };
  } catch (error: any) {
    console.error(`执行MySQL查询失败:`, error);
    throw error;
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch (e) {
        console.error('Error closing MySQL connection:', e);
      }
    }
  }
}

// ==================== PostgreSQL 实现 ====================
/**
 * 测试PostgreSQL连接
 */
async function testPostgreSqlConnection(connection: DbConnection): Promise<TestConnectionResult> {
  const client = new pg.Client({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database_name,
    connectionTimeoutMillis: 10000 // 10秒连接超时
  });
  
  try {
    await client.connect();
    
    // 获取版本信息
    const result = await client.query('SELECT version()');
    const version = result.rows[0]?.version || 'Unknown';
    
    return {
      success: true,
      message: '连接成功',
      details: {
        server: 'PostgreSQL',
        version: version,
        connection_id: (client as any).processID
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `PostgreSQL连接失败: ${error.message}`,
      details: error
    };
  } finally {
    try {
      await client.end();
    } catch (e) {
      console.error('Error closing PostgreSQL connection:', e);
    }
  }
}

/**
 * 获取PostgreSQL表和视图列表
 */
  async function getPostgreSqlTables(connection: DbConnection): Promise<Array<{
    name: string;
    type: string;
    rows: number;
    size: string;
    create_time: string;
    comment: string;
  }>> {
  const client = new pg.Client({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database_name,
    connectionTimeoutMillis: 10000 // 10秒连接超时
  });
  
  try {
    await client.connect();
    
    // 获取表列表
    const tablesQuery = `
      SELECT 
        c.relname AS name,
        'table' AS type,
        pg_stat_get_live_tuples(c.oid) AS rows,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
        to_char(COALESCE(pg_stat_file('base/'||current_database()::oid||'/'||c.relfilenode::text)::json->>'modification', null)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS create_time,
        d.description AS comment
      FROM 
        pg_class c
      LEFT JOIN 
        pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN 
        pg_description d ON d.objoid = c.oid AND d.objsubid = 0
      WHERE 
        c.relkind = 'r'
        AND n.nspname = 'public'
      ORDER BY 
        c.relname
    `;
    
    // 获取视图列表
    const viewsQuery = `
      SELECT 
        c.relname AS name,
        'view' AS type,
        NULL AS rows,
        NULL AS size,
        to_char(COALESCE(pg_stat_file('base/'||current_database()::oid||'/'||c.relfilenode::text)::json->>'modification', null)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS create_time,
        d.description AS comment
      FROM 
        pg_class c
      LEFT JOIN 
        pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN 
        pg_description d ON d.objoid = c.oid AND d.objsubid = 0
      WHERE 
        c.relkind = 'v'
        AND n.nspname = 'public'
      ORDER BY 
        c.relname
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const viewsResult = await client.query(viewsQuery);
    
    // 合并表和视图结果
    const result = [...tablesResult.rows, ...viewsResult.rows].map(item => ({
      name: item.name,
      type: item.type,
      rows: item.rows || 0,
      size: item.size || '-',
      create_time: item.create_time || new Date().toISOString(),
      comment: item.comment || ''
    }));
    
    return result;
  } catch (error: any) {
    console.error(`获取PostgreSQL表列表失败:`, error);
    return [];
  } finally {
    try {
      await client.end();
    } catch (e) {
      console.error('Error closing PostgreSQL connection:', e);
    }
  }
}

/**
 * 获取PostgreSQL表结构
 */
  async function getPostgreSqlTableStructure(connection: DbConnection, tableName: string): Promise<{
    name: string;
    comment: string;
    fields: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default: any;
      primary: boolean;
      comment: string;
    }>;
    indexes: Array<{
      name: string;
      columns: string[];
      unique: boolean;
    }>;
  }> {
  const client = new pg.Client({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database_name,
    connectionTimeoutMillis: 10000 // 10秒连接超时
  });
  
  try {
    await client.connect();
    
    // 获取表注释
    const tableCommentQuery = `
      SELECT 
        obj_description(c.oid) AS comment
      FROM 
        pg_class c
      JOIN 
        pg_namespace n ON n.oid = c.relnamespace
      WHERE 
        c.relname = $1
        AND n.nspname = 'public'
    `;
    
    const tableCommentResult = await client.query(tableCommentQuery, [tableName]);
    const tableComment = tableCommentResult.rows[0]?.comment || '';
    
    // 获取字段信息
    const columnsQuery = `
      SELECT 
        a.attname AS name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
        NOT a.attnotnull AS nullable,
        pg_get_expr(d.adbin, d.adrelid) AS default_value,
        (CASE WHEN co.contype = 'p' THEN true ELSE false END) AS primary_key,
        col_description(a.attrelid, a.attnum) AS comment
      FROM 
        pg_attribute a
      LEFT JOIN 
        pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      LEFT JOIN 
        pg_constraint co ON co.conrelid = a.attrelid AND a.attnum = ANY(co.conkey) AND co.contype = 'p'
      JOIN 
        pg_class c ON c.oid = a.attrelid
      JOIN 
        pg_namespace n ON n.oid = c.relnamespace
      WHERE 
        c.relname = $1
        AND n.nspname = 'public'
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY 
        a.attnum
    `;
    
    const columnsResult = await client.query(columnsQuery, [tableName]);
    
    // 获取索引信息
    const indexesQuery = `
      SELECT 
        i.relname AS name,
        a.attname AS column_name,
        ix.indisunique AS is_unique
      FROM 
        pg_index ix
      JOIN 
        pg_class i ON i.oid = ix.indexrelid
      JOIN 
        pg_class t ON t.oid = ix.indrelid
      JOIN 
        pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN 
        pg_namespace n ON n.oid = t.relnamespace
      WHERE 
        t.relname = $1
        AND n.nspname = 'public'
      ORDER BY 
        i.relname, array_position(ix.indkey, a.attnum)
    `;
    
    const indexesResult = await client.query(indexesQuery, [tableName]);
    
    // 处理索引信息
    const indexMap = new Map();
    (indexesResult.rows as Array<{name: string; column_name: string; is_unique: boolean}>).forEach(idx => {
      if (!indexMap.has(idx.name)) {
        indexMap.set(idx.name, {
          name: idx.name,
          columns: [],
          unique: idx.is_unique
        });
      }
      indexMap.get(idx.name).columns.push(idx.column_name);
    });
    
    // 构建返回结果
    return {
      name: tableName,
      comment: tableComment,
      fields: columnsResult.rows.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        default: col.default_value,
        primary: col.primary_key,
        comment: col.comment || ''
      })),
      indexes: Array.from(indexMap.values())
    };
  } catch (error: any) {
    console.error(`获取PostgreSQL表结构失败:`, error);
    return {
      name: tableName,
      comment: '',
      fields: [],
      indexes: []
    };
  } finally {
    try {
      await client.end();
    } catch (e) {
      console.error('Error closing PostgreSQL connection:', e);
    }
  }
}

/**
 * 执行PostgreSQL查询
 */
  export async function executePostgreSqlQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<{
    fields: string[];
    rows: any[];
    rowCount: number;
    sql: string;
  }> {
  const client = new pg.Client({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database_name,
    connectionTimeoutMillis: 10000 // 10秒连接超时
  });
  
  try {
    await client.connect();
    
    // 执行查询
    const result = await client.query(sql, params);
    
    // 处理字段信息
    const fieldNames = result.fields ? result.fields.map(f => f.name) : [];
    
    return {
      fields: fieldNames,
      rows: result.rows,
      rowCount: result.rowCount,
      sql: sql
    };
  } catch (error: any) {
    console.error(`执行PostgreSQL查询失败:`, error);
    throw error;
  } finally {
    try {
      await client.end();
    } catch (e) {
      console.error('Error closing PostgreSQL connection:', e);
    }
  }
}

// ==================== SQL Server 实现 ====================

/**
 * 测试SQL Server连接
 */
async function testSqlServerConnection(connection: DbConnection): Promise<TestConnectionResult> {
  try {
    const config = {
      server: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name,
      options: {
        trustServerCertificate: true,
        connectTimeout: 10000
      }
    };
    
    // 创建连接池
    const pool = await mssql.connect(config);
    
    // 获取版本信息
    const result = await pool.request().query('SELECT @@VERSION as version');
    const version = result.recordset[0]?.version || 'Unknown';
    
    // 获取连接ID
    const connIdResult = await pool.request().query('SELECT @@SPID as connection_id');
    const connectionId = connIdResult.recordset[0]?.connection_id || 0;
    
    await pool.close();
    
    return {
      success: true,
      message: '连接成功',
      details: {
        server: 'SQL Server',
        version: version,
        connection_id: connectionId
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `SQL Server连接失败: ${error.message}`,
      details: error
    };
  }
}

/**
 * 获取SQL Server表和视图列表
 */
async function getSqlServerTables(connection: DbConnection): Promise<Array<{
  name: string;
  type: string;
  rows: number;
  size: string;
  create_time: string;
  comment: string;
}>> {
  const config = {
    server: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database_name,
    options: {
      trustServerCertificate: true,
      connectTimeout: 10000
    }
  };
  
  try {
    // 创建连接池
    const pool = await mssql.connect(config);
    
    // 获取表列表
    const tablesQuery = `
      SELECT 
        t.name AS name,
        'table' AS type,
        p.rows AS rows,
        CAST(ROUND((SUM(a.total_pages) * 8) / 1024.0, 0) AS INT) AS size_kb,
        CONVERT(VARCHAR, t.create_date, 127) AS create_time,
        ISNULL(ep.value, '') AS comment
      FROM 
        sys.tables t
      INNER JOIN 
        sys.indexes i ON t.object_id = i.object_id
      INNER JOIN 
        sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
      INNER JOIN 
        sys.allocation_units a ON p.partition_id = a.container_id
      LEFT JOIN 
        sys.extended_properties ep ON t.object_id = ep.major_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
      WHERE 
        i.object_id > 255 AND i.index_id <= 1
      GROUP BY 
        t.name, t.create_date, p.rows, ep.value
      ORDER BY 
        t.name
    `;
    
    // 获取视图列表
    const viewsQuery = `
      SELECT 
        v.name AS name,
        'view' AS type,
        0 AS rows,
        0 AS size_kb,
        CONVERT(VARCHAR, v.create_date, 127) AS create_time,
        ISNULL(ep.value, '') AS comment
      FROM 
        sys.views v
      LEFT JOIN 
        sys.extended_properties ep ON v.object_id = ep.major_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
      ORDER BY 
        v.name
    `;
    
    const tablesResult = await pool.request().query(tablesQuery);
    const viewsResult = await pool.request().query(viewsQuery);
    
    // 合并表和视图结果
    const result = [...tablesResult.recordset, ...viewsResult.recordset].map(item => ({
      name: item.name,
      type: item.type,
      rows: item.rows || 0,
      size: item.size_kb ? `${item.size_kb} KB` : '-',
      create_time: item.create_time || new Date().toISOString(),
      comment: item.comment || ''
    }));
    
    await pool.close();
    return result;
  } catch (error: any) {
    console.error(`获取SQL Server表列表失败:`, error);
    return [];
  }
}

/**
 * 获取SQL Server表结构
 */
async function getSqlServerTableStructure(connection: DbConnection, tableName: string): Promise<{
  name: string;
  comment: string;
  fields: Array<{
    name: string;
    type: string;
    nullable: boolean;
    default: any;
    primary: boolean;
    comment: string;
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}> {
  const config = {
    server: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database_name,
    options: {
      trustServerCertificate: true,
      connectTimeout: 10000
    }
  };
  
  try {
    // 创建连接池
    const pool = await mssql.connect(config);
    
    // 获取表注释
    const tableCommentQuery = `
      SELECT 
        ISNULL(ep.value, '') AS comment
      FROM 
        sys.objects o
      LEFT JOIN 
        sys.extended_properties ep ON o.object_id = ep.major_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
      WHERE 
        o.name = @tableName
    `;
    
    const tableCommentResult = await pool.request()
      .input('tableName', mssql.NVarChar, tableName)
      .query(tableCommentQuery);
    
    const tableComment = tableCommentResult.recordset[0]?.comment || '';
    
    // 获取字段信息
    const columnsQuery = `
      SELECT 
        c.name AS name,
        t.name + CASE 
          WHEN t.name IN ('varchar', 'nvarchar', 'char', 'nchar') THEN '(' + CAST(c.max_length AS VARCHAR) + ')'
          WHEN t.name IN ('decimal', 'numeric') THEN '(' + CAST(c.precision AS VARCHAR) + ',' + CAST(c.scale AS VARCHAR) + ')'
          ELSE ''
        END AS type,
        c.is_nullable AS nullable,
        ISNULL(d.definition, '') AS default_value,
        CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS primary_key,
        ISNULL(ep.value, '') AS comment
      FROM 
        sys.columns c
      JOIN 
        sys.types t ON c.user_type_id = t.user_type_id
      JOIN 
        sys.objects o ON c.object_id = o.object_id
      LEFT JOIN 
        sys.default_constraints d ON c.default_object_id = d.object_id
      LEFT JOIN 
        sys.extended_properties ep ON c.object_id = ep.major_id AND c.column_id = ep.minor_id AND ep.name = 'MS_Description'
      LEFT JOIN (
        SELECT 
          ic.column_id, ic.object_id
        FROM 
          sys.index_columns ic
        JOIN 
          sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        WHERE 
          i.is_primary_key = 1
      ) pk ON c.column_id = pk.column_id AND c.object_id = pk.object_id
      WHERE 
        o.name = @tableName
      ORDER BY 
        c.column_id
    `;
    
    const columnsResult = await pool.request()
      .input('tableName', mssql.NVarChar, tableName)
      .query(columnsQuery);
    
    // 获取索引信息
    const indexesQuery = `
      SELECT 
        i.name AS name,
        c.name AS column_name,
        i.is_unique AS is_unique
      FROM 
        sys.indexes i
      JOIN 
        sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      JOIN 
        sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      JOIN 
        sys.objects o ON i.object_id = o.object_id
      WHERE 
        o.name = @tableName
        AND i.is_primary_key = 0 -- 排除主键，因为已经在字段信息中标记了
      ORDER BY 
        i.name, ic.key_ordinal
    `;
    
    const indexesResult = await pool.request()
      .input('tableName', mssql.NVarChar, tableName)
      .query(indexesQuery);
    
    // 处理索引信息
    const indexMap = new Map();
    (indexesResult.recordset as Array<{name: string; column_name: string; is_unique: boolean}>).forEach(idx => {
      if (!indexMap.has(idx.name)) {
        indexMap.set(idx.name, {
          name: idx.name,
          columns: [],
          unique: idx.is_unique
        });
      }
      indexMap.get(idx.name).columns.push(idx.column_name);
    });
    
    // 添加主键索引
    const primaryKeyColumns = columnsResult.recordset
      .filter(col => col.primary_key)
      .map(col => col.name);
    
    if (primaryKeyColumns.length > 0) {
      indexMap.set('PK_' + tableName, {
        name: 'PK_' + tableName,
        columns: primaryKeyColumns,
        unique: true
      });
    }
    
    // 构建返回结果
    const result = {
      name: tableName,
      comment: tableComment,
      fields: columnsResult.recordset.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        default: col.default_value,
        primary: col.primary_key === 1,
        comment: col.comment || ''
      })),
      indexes: Array.from(indexMap.values())
    };
    
    await pool.close();
    return result;
  } catch (error: any) {
    console.error(`获取SQL Server表结构失败:`, error);
    return {
      name: tableName,
      comment: '',
      fields: [],
      indexes: []
    };
  }
}

/**
 * 执行SQL Server查询
 */
export async function executeSqlServerQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<{
  fields: string[];
  rows: any[];
  rowCount: number;
  sql: string;
}> {
  try {
    const config = {
      server: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name,
      options: {
        trustServerCertificate: true,
        connectTimeout: 10000,
        encrypt: false
      }
    };

    // Create a connection pool
    const pool = await mssql.connect(config);
    
    // Prepare the request
    let request = pool.request();
    
    // Add parameters
    if (params && params.length > 0) {
      const paramNames: string[] = [];
      let paramIndex = 0;
      
      sql = sql.replace(/\?/g, () => {
        const paramName = `@p${++paramIndex}`;
        paramNames.push(paramName);
        return paramName;
      });
      
      params.forEach((param, index) => {
        if (param === null || param === undefined) {
          request = request.input(paramNames[index], null);
        } else if (typeof param === 'boolean') {
          request = request.input(paramNames[index], mssql.Bit, param);
        } else if (typeof param === 'number') {
          request = request.input(paramNames[index], mssql.Float, param);
        } else if (typeof param === 'string') {
          request = request.input(paramNames[index], mssql.NVarChar, param);
        } else {
          request = request.input(paramNames[index], param);
        }
      });
    }
    
    // Execute the query
    const result = await request.query(sql);
    
    // Close the pool
    await pool.close();
    
    return {
      fields: result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [],
      rows: result.recordset,
      rowCount: result.rowsAffected ? result.rowsAffected[0] : 0,
      sql: sql
    };
  } catch (error: any) {
    console.error(`执行SQL Server查询失败:`, error);
    throw error;
  }
}

// ==================== Oracle 实现 ====================

/**
 * 测试Oracle连接
 */
async function testOracleConnection(connection: DbConnection): Promise<TestConnectionResult> {
  let conn;
  try {
    // 创建Oracle连接
    conn = await oracledb.getConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name
    });
    
    // 获取版本信息
    const result = await conn.execute('SELECT * FROM v$version');
    const version = result.rows && result.rows.length > 0 ? result.rows[0][0] : 'Unknown';
    
    return {
      success: true,
      message: '连接成功',
      details: {
        server: 'Oracle',
        version: version,
        connection_id: conn.getConnectionId()
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Oracle连接失败: ${error.message}`,
      details: error
    };
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error('Error closing Oracle connection:', e);
      }
    }
  }
}

/**
 * 获取Oracle表和视图列表
 */
async function getOracleTables(connection: DbConnection): Promise<Array<{
  name: string;
  type: string;
  rows: number;
  size: string;
  create_time: string;
  comment: string;
}>> {
  let conn;
  try {
    // 创建Oracle连接
    conn = await oracledb.getConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name
    });
    
    // 获取表列表
    const tablesQuery = `
      SELECT 
        table_name AS name,
        'table' AS type,
        num_rows AS rows,
        ROUND((block_size * num_blocks) / 1024) AS size_kb,
        created AS create_time,
        comments AS comment
      FROM 
        user_tables
      ORDER BY 
        table_name
    `;
    
    // 获取视图列表
    const viewsQuery = `
      SELECT 
        view_name AS name,
        'view' AS type,
        NULL AS rows,
        0 AS size_kb,
        created AS create_time,
        comments AS comment
      FROM 
        user_views
      ORDER BY 
        view_name
    `;
    
    const tablesResult = await conn.execute(tablesQuery);
    const viewsResult = await conn.execute(viewsQuery);
    
    // 合并表和视图结果
    const result = [...tablesResult.rows, ...viewsResult.rows].map(item => ({
      name: item.name,
      type: item.type,
      rows: item.rows || 0,
      size: item.size_kb ? `${item.size_kb} KB` : '-',
      create_time: item.create_time ? new Date(item.create_time).toISOString() : new Date().toISOString(),
      comment: item.comment || ''
    }));
    
    return result;
  } catch (error: any) {
    console.error(`获取Oracle表列表失败:`, error);
    return [];
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error('Error closing Oracle connection:', e);
      }
    }
  }
}

/**
 * 获取Oracle表结构
 */
async function getOracleTableStructure(connection: DbConnection, tableName: string): Promise<{
  name: string;
  comment: string;
  fields: Array<{
    name: string;
    type: string;
    nullable: boolean;
    default: any;
    primary: boolean;
    comment: string;
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}> {
  let conn;
  try {
    // 创建Oracle连接
    conn = await oracledb.getConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name
    });
    
    // 获取表注释
    const tableCommentQuery = `
      SELECT 
        comments
      FROM 
        user_tab_comments
      WHERE 
        table_name = UPPER(:tableName)
    `;
    
    const tableCommentResult = await conn.execute(tableCommentQuery, [tableName]);
    const tableComment = tableCommentResult.rows && tableCommentResult.rows.length > 0 ? tableCommentResult.rows[0][0] : '';
    
    // 获取字段信息
    const columnsQuery = `
      SELECT 
        a.column_name AS name,
        data_type AS type,
        nullable,
        data_default AS default_value,
        (CASE WHEN c.constraint_type = 'P' THEN 'YES' ELSE 'NO' END) AS primary_key,
        col_comments AS comment
      FROM 
        user_tab_columns a
      LEFT JOIN 
        user_col_comments c ON a.table_name = c.table_name AND a.column_name = c.column_name
      WHERE 
        a.table_name = UPPER(:tableName)
      ORDER BY 
        a.column_id
    `;
    
    const columnsResult = await conn.execute(columnsQuery, [tableName]);
    
    // 获取索引信息
    const indexesQuery = `
      SELECT 
        i.index_name AS name,
        c.column_name,
        i.uniqueness = 'UNIQUE' AS is_unique
      FROM 
        user_indexes i
      JOIN 
        user_ind_columns c ON i.index_name = c.index_name
      WHERE 
        i.table_name = UPPER(:tableName)
      ORDER BY 
        i.index_name, c.column_position
    `;
    
    const indexesResult = await conn.execute(indexesQuery, [tableName]);
    
    // 处理索引信息
    const indexMap = new Map();
    (indexesResult.rows as Array<{name: string; column_name: string; is_unique: boolean}>).forEach(idx => {
      if (!indexMap.has(idx.name)) {
        indexMap.set(idx.name, {
          name: idx.name,
          columns: [],
          unique: idx.is_unique
        });
      }
      indexMap.get(idx.name).columns.push(idx.column_name);
    });
    
    // 构建返回结果
    return {
      name: tableName,
      comment: tableComment,
      fields: columnsResult.rows.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable === 'Y',
        default: col.default_value,
        primary: col.primary_key === 'YES',
        comment: col.comment || ''
      })),
      indexes: Array.from(indexMap.values())
    };
  } catch (error: any) {
    console.error(`获取Oracle表结构失败:`, error);
    return {
      name: tableName,
      comment: '',
      fields: [],
      indexes: []
    };
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error('Error closing Oracle connection:', e);
      }
    }
  }
}

/**
 * 执行Oracle查询
 */
export async function executeOracleQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<{
  fields: string[];
  rows: any[];
  rowCount: number;
  sql: string;
}> {
  let conn;
  try {
    // 创建Oracle连接
    conn = await oracledb.getConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database_name
    });
    
    // 处理参数
    const bindParams: { [key: string]: any } = {};
    const paramNames: string[] = [];
    
    params.forEach((param, index) => {
      const paramName = `p${index + 1}`;
      paramNames.push(paramName);
      bindParams[paramName] = param;
    });
    
    // 执行查询
    const result = await conn.execute(sql, bindParams);
    
    return {
      fields: result.metaData ? result.metaData.map((f: any) => f.name) : [],
      rows: result.rows || [],
      rowCount: result.rows ? result.rows.length : 0,
      sql: sql
    };
  } catch (error: any) {
    console.error(`执行Oracle查询失败:`, error);
    throw error;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error('Error closing Oracle connection:', e);
      }
    }
  }
}

// ==================== SQLite 实现 ====================

/**
 * 测试SQLite连接
 */
async function testSqliteConnection(connection: DbConnection): Promise<TestConnectionResult> {
  return new Promise((resolve) => {
    try {
      // 确定数据库路径
      const dbPath = connection.connection_string || 
        path.join(process.cwd(), 'data', `${connection.database_name}.db`);
      
      // 确保目录存在
      const dirPath = path.dirname(dbPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 打开SQLite数据库
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          resolve({
            success: false,
            message: `SQLite连接失败: ${err.message}`,
            details: err
          });
          return;
        }
        
        // 测试连接
        db.get('SELECT 1 AS test', (err, row) => {
          if (err) {
            db.close();
            resolve({
              success: false,
              message: `SQLite查询失败: ${err.message}`,
              details: err
            });
            return;
          }
          
          db.close();
          resolve({
            success: true,
            message: '连接成功',
            details: {
              server: 'SQLite',
              version: 'N/A',
              connection_id: 'N/A'
            }
          });
        });
      });
    } catch (error: any) {
      resolve({
        success: false,
        message: `SQLite连接失败: ${error.message}`,
        details: error
      });
    }
  });
}

/**
 * 获取SQLite表和视图列表
 */
async function getSqliteTables(connection: DbConnection): Promise<Array<{
  name: string;
  type: string;
  rows: number;
  size: string;
  create_time: string;
  comment: string;
}>> {
  return new Promise((resolve) => {
    try {
      // 确定数据库路径
      const dbPath = connection.connection_string || 
        path.join(process.cwd(), 'data', `${connection.database_name}.db`);
      
      // 确保目录存在
      const dirPath = path.dirname(dbPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 打开SQLite数据库
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error(`打开SQLite数据库失败:`, err);
          resolve([]);
          return;
        }
        
        // 获取表列表
        const sql = `
          SELECT 
            name AS table_name, 
            type,
            NULL AS rows,
            NULL AS size_kb,
            NULL AS create_time,
            NULL AS comment
          FROM 
            sqlite_master 
          WHERE 
            type IN ('table', 'view')
        `;
        
        db.all(sql, [], (err, rows) => {
          if (err) {
            console.error(`获取SQLite表列表失败:`, err);
            db.close();
            resolve([]);
            return;
          }
          
          // 处理结果
          const result = rows.map(item => ({
            name: item.table_name,
            type: item.type === 'table' ? 'table' : 'view',
            rows: 0,
            size: '-',
            create_time: new Date().toISOString(),
            comment: ''
          }));
          
          db.close();
          resolve(result);
        });
      });
    } catch (error: any) {
      console.error(`获取SQLite表列表失败:`, error);
      resolve([]);
    }
  });
}

/**
 * 获取SQLite表结构
 */
async function getSqliteTableStructure(connection: DbConnection, tableName: string): Promise<{
  name: string;
  comment: string;
  fields: Array<{
    name: string;
    type: string;
    nullable: boolean;
    default: any;
    primary: boolean;
    comment: string;
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}> {
  let db;
  try {
    // 打开SQLite数据库
    db = new Database(connection.database_name, {
      verbose: console.log
    });
    
    // 获取表注释
    const tableComment = '';
    
    // 获取字段信息
    const columns = db.prepare(`
      PRAGMA table_info(?
    `).all(tableName);
    
    // 获取索引信息
    const indexInfo = db.prepare(`
      SELECT 
        name AS index_name,
        sql AS index_sql
      FROM 
        sqlite_master 
      WHERE 
        type = 'index' 
        AND tbl_name = ?
    `).all(tableName);
    
    // 处理索引信息
    const indexMap = new Map();
    (indexInfo as Array<{index_name: string; index_sql: string}>).forEach(idx => {
      if (!indexMap.has(idx.index_name)) {
        indexMap.set(idx.index_name, {
          name: idx.index_name,
          columns: [],
          unique: idx.index_sql.includes('UNIQUE')
        });
      }
      const columnNames = idx.index_sql.match(/\(([^)]+)\)/);
      if (columnNames) {
        const columns = columnNames[1].split(',').map(c => c.trim());
        indexMap.get(idx.index_name).columns.push(...columns);
      }
    });
    
    // 构建返回结果
    return {
      name: tableName,
      comment: tableComment,
      fields: (columns as any[]).map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        default: col.dflt_value,
        primary: col.pk === 1,
        comment: ''
      })),
      indexes: Array.from(indexMap.values())
    };
  } catch (error: any) {
    console.error(`获取SQLite表结构失败:`, error);
    return {
      name: tableName,
      comment: '',
      fields: [],
      indexes: []
    };
  } finally {
    if (db) {
      db.close();
    }
  }
}

/**
 * 执行SQLite查询
 */
export async function executeSqliteQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<{
  fields: string[];
  rows: any[];
  rowCount: number;
  sql: string;
}> {
  return new Promise((resolve, reject) => {
    try {
      // 确定数据库路径
      const dbPath = connection.connection_string || 
        path.join(process.cwd(), 'data', `${connection.database_name}.db`);
      
      // 确保目录存在
      const dirPath = path.dirname(dbPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 打开SQLite数据库
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(new Error(`SQLite连接错误: ${err.message}`));
          return;
        }
        
        // 判断是否为查询操作
        const isSelect = sql.trim().toLowerCase().startsWith('select');
        
        if (isSelect) {
          // 查询操作
          db.all(sql, params, (err, rows) => {
            if (err) {
              db.close();
              reject(new Error(`SQLite查询错误: ${err.message}`));
              return;
            }
            
            // 获取列信息（如果有结果）
            let fields: string[] = [];
            if (rows && rows.length > 0) {
              fields = Object.keys(rows[0]);
            }
            
            db.close();
            resolve({
              fields: fields,
              rows: rows,
              rowCount: rows.length,
              sql: sql
            });
          });
        } else {
          // 更新操作
          db.run(sql, params, function(err) {
            if (err) {
              db.close();
              reject(new Error(`SQLite更新错误: ${err.message}`));
              return;
            }
            
            db.close();
            resolve({
              fields: [],
              rows: [{ changes: this.changes, lastID: this.lastID }],
              rowCount: this.changes,
              sql: sql
            });
          });
        }
      });
    } catch (error: any) {
      console.error(`执行SQLite查询失败:`, error);
      reject(error);
    }
  });
}

// ==================== 统一接口 ====================
/**
 * 测试数据库连接
 */
export async function testConnection(connection: DbConnection): Promise<TestConnectionResult> {
  try {
    // 根据数据库类型选择不同的连接方式
    switch (connection.db_type.toLowerCase()) {
      case 'mysql':
        return await testMySqlConnection(connection);
      case 'postgresql':
        return await testPostgreSqlConnection(connection);
      case 'sqlserver':
        return await testSqlServerConnection(connection);
      case 'oracle':
        return await testOracleConnection(connection);
      case 'sqlite':
        return await testSqliteConnection(connection);
      default:
        return {
          success: false,
          message: `不支持的数据库类型: ${connection.db_type}`
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `连接测试失败: ${error.message}`,
      details: error
    };
  }
}

/**
 * 获取数据库对象列表（表和视图）
 */
export async function getObjects(connection: DbConnection): Promise<any[]> {
  try {
    // 根据数据库类型选择不同的查询方式
    switch (connection.db_type.toLowerCase()) {
      case 'mysql':
        return await getMySqlTables(connection);
      case 'postgresql':
        return await getPostgreSqlTables(connection);
      case 'sqlserver':
        return await getSqlServerTables(connection);
      case 'oracle':
        return await getOracleTables(connection);
      case 'sqlite':
        return await getSqliteTables(connection);
      default:
        return [];
    }
  } catch (error) {
    console.error(`获取对象列表失败:`, error);
    return [];
  }
}

/**
 * 获取表结构信息
 */
export async function getStructure(connection: DbConnection, tableName: string): Promise<any> {
  try {
    // 根据数据库类型选择不同的查询方式
    switch (connection.db_type.toLowerCase()) {
      case 'mysql':
        return await getMySqlTableStructure(connection, tableName);
      case 'postgresql':
        return await getPostgreSqlTableStructure(connection, tableName);
      case 'sqlserver':
        return await getSqlServerTableStructure(connection, tableName);
      case 'oracle':
        return await getOracleTableStructure(connection, tableName);
      case 'sqlite':
        return await getSqliteTableStructure(connection, tableName);
      default:
        return {
          name: tableName,
          fields: [],
          indexes: []
        };
    }
  } catch (error) {
    console.error(`获取表结构失败:`, error);
    return {
      name: tableName,
      fields: [],
      indexes: []
    };
  }
}

/**
 * 执行SQL查询
 */
export async function execute(connection: DbConnection, sql: string, params: any[] = []): Promise<any> {
  try {
    // 根据数据库类型选择不同的查询方式
    switch (connection.db_type.toLowerCase()) {
      case 'mysql':
        return await executeMySqlQuery(connection, sql, params);
      case 'postgresql':
        return await executePostgreSqlQuery(connection, sql, params);
      case 'sqlserver':
        return await executeSqlServerQuery(connection, sql, params);
      case 'oracle':
        return await executeOracleQuery(connection, sql, params);
      case 'sqlite':
        return await executeSqliteQuery(connection, sql, params);
      default:
        throw new Error(`不支持的数据库类型: ${connection.db_type}`);
    }
  } catch (error) {
    console.error(`执行查询失败:`, error);
    throw error;
  }
}

/**
 * 将数据库连接信息写入环境变量
 * @param connection 数据库连接信息
 */
export function writeDbConnToEnv(connection: DbConnection): void {
  try {
    process.env.DB_TYPE = connection.db_type;
    process.env.DB_HOST = connection.host;
    process.env.DB_PORT = connection.port.toString();
    process.env.DB_USER = connection.username;
    process.env.DB_PASSWORD = connection.password;
    process.env.DB_NAME = connection.database_name;
    if (connection.connection_string) {
      process.env.DB_CONNECTION_STRING = connection.connection_string;
    }
    console.log('Database connection info written to environment variables');
  } catch (error) {
    console.error('Failed to write database connection info to environment variables:', error);
    throw error;
  }
}
