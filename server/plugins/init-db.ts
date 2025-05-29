import { initDatabase } from '../utils/db-manager';
import { initDbConnection } from '../utils/init-db-connection';
import { initSqliteDb } from '../utils/init-sqlite';
import { syncDatabaseConnections } from '../utils/sync-db-connections';

export default defineNitroPlugin(async () => {
  try {
    console.log('正在初始化数据库...');
    
    // 初始化主数据库
    await initDatabase();
    
    // 初始化 SQLite 数据库（可选）
    await Promise.resolve(initSqliteDb());
    
    // 初始化数据库连接
    console.log('正在初始化数据库连接...');
    await initDbConnection();
    
    // 同步数据库连接信息
    console.log('正在同步数据库连接信息...');
    await syncDatabaseConnections();
    
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
});
