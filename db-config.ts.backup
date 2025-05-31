/**
 * 数据库连接配置
 * 这个文件用于存储数据库连接信息
 */

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

// 从数据库中读取的连接1
const db1Connection: DbConnection = {
  id: 10,
  name: '192.168.0.200',
  host: '192.168.0.200',
  port: 3306,
  username: 'root',
  password: 'root',
  database_name: 'dborder',
  db_type: 'mysql',
  connection_string: '{"ssl":false}'
};

// 从数据库中读取的连接2
const db2Connection: DbConnection = {
  id: 3,
  name: 'pg_local',
  host: '127.0.0.1',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database_name: 'strapi',
  db_type: 'postgresql'
};

// 从数据库中读取的连接3
const db3Connection: DbConnection = {
  id: 2,
  name: 'prd_stock',
  host: '127.0.0.1',
  port: 3306,
  username: 'root',
  password: 'root',
  database_name: 'prd_local',
  db_type: 'mysql'
};

// 从数据库中读取的连接4
const db4Connection: DbConnection = {
  id: 1,
  name: '127_docker',
  host: '127.0.0.1',
  port: 3306,
  username: 'root',
  password: 'root',
  database_name: 'sqlrest',
  db_type: 'mysql'
};

// 预定义的数据库连接
export const dbConnections: Record<string, DbConnection> = {
  [db1Connection.name]: db1Connection,
  [db2Connection.name]: db2Connection,
  [db3Connection.name]: db3Connection,
  [db4Connection.name]: db4Connection
};

/**
 * 根据名称获取数据库连接信息
 * @param name 连接名称
 * @returns 数据库连接信息
 */
export function getDbConnectionByName(name: string): DbConnection | null {
  return dbConnections[name] || null;
}

/**
 * 根据ID获取数据库连接信息
 * @param id 连接ID
 * @returns 数据库连接信息
 */
export function getDbConnectionById(id: number): DbConnection | null {
  for (const key in dbConnections) {
    if (dbConnections[key].id === id) {
      return dbConnections[key];
    }
  }
  return null;
}

/**
 * 获取所有数据库连接
 * @returns 所有数据库连接的数组
 */
export function getAllDbConnections(): DbConnection[] {
  return Object.values(dbConnections);
}
