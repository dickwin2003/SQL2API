/**
 * 数据库连接相关类型定义
 */

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

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: any;
}
