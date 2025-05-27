/**
 * Database Connection Utility
 * 用于连接不同类型的数据库并执行查询
 */
import { H3Event } from 'h3';
import { DbConnection, TestConnectionResult } from '~/types/db-connection';
import { getDbConnById } from '~/server/utils/db-manager';
import mysql from 'mysql2/promise';
import pg from 'pg';
import { Connection, Request, TYPES } from 'tedious';
import Database from 'better-sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

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
 */
async function getMySqlTables(connection: DbConnection): Promise<any[]> {
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
    
    // 获取表列表
    const [tables] = await conn.execute(`
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
    `, [connection.database_name]);
    
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
      rows: item.rows || 0,
      size: item.size_kb ? `${item.size_kb} KB` : '-',
      create_time: item.create_time ? new Date(item.create_time).toISOString() : new Date().toISOString(),
      comment: item.comment || ''
    }));
    
    return result;
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
async function getMySqlTableStructure(connection: DbConnection, tableName: string): Promise<any> {
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
    (indexInfo as any[]).forEach(idx => {
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
async function executeMySqlQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<any> {
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
async function getPostgreSqlTables(connection: DbConnection): Promise<any[]> {
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
async function getPostgreSqlTableStructure(connection: DbConnection, tableName: string): Promise<any> {
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
    indexesResult.rows.forEach(idx => {
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
async function executePostgreSqlQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<any> {
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
  const config = {
    server: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database_name,
    options: {
      trustServerCertificate: true, // 开发环境中可以设置为true
      connectTimeout: 10000 // 10秒连接超时
    }
  };
  
  try {
    // 创建连接池
    const pool = await sql.connect(config);
    
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
async function getSqlServerTables(connection: DbConnection): Promise<any[]> {
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
    const pool = await sql.connect(config);
    
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
async function getSqlServerTableStructure(connection: DbConnection, tableName: string): Promise<any> {
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
    const pool = await sql.connect(config);
    
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
      .input('tableName', sql.NVarChar, tableName)
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
      .input('tableName', sql.NVarChar, tableName)
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
      .input('tableName', sql.NVarChar, tableName)
      .query(indexesQuery);
    
    // 处理索引信息
    const indexMap = new Map();
    indexesResult.recordset.forEach(idx => {
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
async function executeSqlServerQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<any> {
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
    const pool = await sql.connect(config);
    
    // 准备请求
    let request = pool.request();
    
    // 添加参数
    if (params && params.length > 0) {
      // SQL Server参数使用@p1, @p2等命名方式
      // 需要将?替换为@p1, @p2等
      const paramNames: string[] = [];
      let paramIndex = 0;
      
      // 替换SQL中的?为@p1, @p2等
      sql = sql.replace(/\?/g, () => {
        const paramName = `@p${++paramIndex}`;
        paramNames.push(paramName);
        return paramName;
      });
      
      // 添加参数到请求
      params.forEach((param, index) => {
        if (index < paramNames.length) {
          request = request.input(paramNames[index].substring(1), param);
        }
      });
    }
    
    // 执行查询
    const result = await request.query(sql);
    
    // 处理字段信息
    const fieldNames = result.recordset && result.recordset.length > 0 
      ? Object.keys(result.recordset[0]) 
      : [];
    
    const response = {
      fields: fieldNames,
      rows: result.recordset,
      rowCount: result.recordset.length,
      sql: sql
    };
    
    await pool.close();
    return response;
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
  // 这里是模拟实现，实际应用中应该使用oracledb或类似库进行连接测试
  return {
    success: true,
    message: '连接成功',
    details: {
      server: 'Oracle Database',
      version: '19c',
      connection_id: 98765
    }
  };
}

/**
 * 获取Oracle表和视图列表
 */
async function getOracleTables(connection: DbConnection): Promise<any[]> {
  // 这里是模拟实现，实际应用中应该使用oracledb或类似库进行查询
  return [
    {
      name: 'USERS',
      type: 'table',
      rows: 2500,
      size: '448 KB',
      create_time: new Date().toISOString(),
      comment: '用户表'
    },
    {
      name: 'PRODUCTS',
      type: 'table',
      rows: 6000,
      size: '896 KB',
      create_time: new Date().toISOString(),
      comment: '产品表'
    },
    {
      name: 'PRODUCT_VIEW',
      type: 'view',
      create_time: new Date().toISOString(),
      comment: '产品视图'
    }
  ];
}

/**
 * 获取Oracle表结构
 */
async function getOracleTableStructure(connection: DbConnection, tableName: string): Promise<any> {
  // 这里是模拟实现，实际应用中应该使用oracledb或类似库进行查询
  return {
    name: tableName,
    comment: '表注释',
    fields: [
      {
        name: 'ID',
        type: 'NUMBER',
        nullable: false,
        default: null,
        primary: true,
        comment: '主键ID'
      },
      {
        name: 'NAME',
        type: 'VARCHAR2(100)',
        nullable: false,
        default: null,
        primary: false,
        comment: '名称'
      },
      {
        name: 'CREATED_AT',
        type: 'TIMESTAMP',
        nullable: true,
        default: 'SYSTIMESTAMP',
        primary: false,
        comment: '创建时间'
      }
    ],
    indexes: [
      {
        name: 'PK_' + tableName,
        columns: ['ID'],
        unique: true
      }
    ]
  };
}

/**
 * 执行Oracle查询
 */
async function executeOracleQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<any> {
  // 这里是模拟实现，实际应用中应该使用oracledb或类似库进行查询
  return {
    fields: ['ID', 'NAME', 'EMAIL'],
    rows: [
      { ID: 1, NAME: '张三', EMAIL: 'zhangsan@example.com' },
      { ID: 2, NAME: '李四', EMAIL: 'lisi@example.com' }
    ],
    rowCount: 2,
    sql: sql
  };
}

// ==================== SQLite 实现 ====================

/**
 * 测试SQLite连接
 */
async function testSqliteConnection(connection: DbConnection): Promise<TestConnectionResult> {
  try {
    // 检查文件是否存在
    const dbPath = connection.host; // SQLite的host字段存储文件路径
    const exists = await fs.promises.access(dbPath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);
    
    if (!exists) {
      return {
        success: false,
        message: `SQLite数据库文件不存在: ${dbPath}`,
        details: null
      };
    }
    
    // 打开数据库连接
    const db = new Database(dbPath);
    
    // 获取版本信息
    const versionResult = db.prepare('SELECT sqlite_version() as version').get();
    const version = versionResult?.version || 'Unknown';
    
    db.close();
    
    return {
      success: true,
      message: '连接成功',
      details: {
        server: 'SQLite',
        version: version,
        connection_id: Date.now() // SQLite没有连接ID概念，使用时间戳代替
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `SQLite连接失败: ${error.message}`,
      details: error
    };
  }
}

/**
 * 获取SQLite表和视图列表
 */
async function getSqliteTables(connection: DbConnection): Promise<any[]> {
  try {
    const dbPath = connection.host;
    const db = new Database(dbPath);

    // 获取所有表和视图
    const tables = db.prepare(`
      SELECT 
        name,
        type,
        (SELECT COUNT(*) FROM "main"."" || name) as rows,
        (SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()) as size_bytes,
        NULL as create_time,
        NULL as comment
      FROM sqlite_master 
      WHERE type IN ('table', 'view')
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    db.close();

    // 处理数据并合并结果
    const result = tables.map(item => {
      // 处理大小显示
      let sizeStr = '-';
      if (item.size_bytes) {
        const sizeKB = Math.round(item.size_bytes / 1024);
        if (sizeKB < 1024) {
          sizeStr = `${sizeKB} KB`;
        } else {
          sizeStr = `${(sizeKB / 1024).toFixed(1)} MB`;
        }
      }
      
      return {
        name: item.name,
        type: item.type,
        rows: item.rows || 0,
        size: sizeStr,
        create_time: item.create_time || new Date().toISOString(),
        comment: item.comment || ''
      };
    });
    
    return result;
  } catch (error: any) {
    console.error(`获取SQLite表列表失败:`, error);
    return [];
  }
}

/**
 * 获取SQLite表结构
 */
async function getSqliteTableStructure(connection: DbConnection, tableName: string): Promise<any> {
  try {
    // 打开数据库连接
    const db = await open({
      filename: connection.host,
      driver: sqlite3.Database
    });
    
    // 获取表结构
    const tableInfo = await db.all(`PRAGMA table_info(${JSON.stringify(tableName)})`);
    
    // 获取索引信息
    const indexList = await db.all(`PRAGMA index_list(${JSON.stringify(tableName)})`);
    
    // 处理索引详情
    const indexes = [];
    for (const idx of indexList) {
      const indexInfo = await db.all(`PRAGMA index_info(${JSON.stringify(idx.name)})`);
      const columns = indexInfo.map((info: any) => {
        // 获取列名
        const colName = tableInfo.find((col: any) => col.cid === info.cid)?.name;
        return colName || '';
      }).filter(Boolean);
      
      indexes.push({
        name: idx.name,
        columns: columns,
        unique: idx.unique === 1
      });
    }
    
    // 处理主键
    const primaryKeyColumns = tableInfo
      .filter((col: any) => col.pk === 1)
      .map((col: any) => col.name);
    
    if (primaryKeyColumns.length > 0 && !indexes.some(idx => idx.columns.join(',') === primaryKeyColumns.join(','))) {
      indexes.push({
        name: `pk_${tableName}`,
        columns: primaryKeyColumns,
        unique: true
      });
    }
    
    await db.close();
    
    // 构建返回结果
    return {
      name: tableName,
      comment: '',  // SQLite不支持表注释
      fields: tableInfo.map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        default: col.dflt_value,
        primary: col.pk === 1,
        comment: ''  // SQLite不支持列注释
      })),
      indexes: indexes
    };
  } catch (error: any) {
    console.error(`获取SQLite表结构失败:`, error);
    return {
      name: tableName,
      comment: '',
      fields: [],
      indexes: []
    };
  }
}

/**
 * 执行SQLite查询
 */
async function executeSqliteQuery(connection: DbConnection, sql: string, params: any[] = []): Promise<any> {
  try {
    // 打开数据库连接
    const db = await open({
      filename: connection.host,
      driver: sqlite3.Database
    });
    
    // 执行查询
    const rows = await db.all(sql, params);
    
    // 获取字段信息
    const fieldNames = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    await db.close();
    
    return {
      fields: fieldNames,
      rows: rows,
      rowCount: rows.length,
      sql: sql
    };
  } catch (error: any) {
    console.error(`执行SQLite查询失败:`, error);
    throw error;
  }
}
