import fs from 'fs';
import path from 'path';
import { getDbConnById } from './db-manager';
import { writeDbConnToEnv } from './db-connection';

/**
 * 初始化数据库连接
 * 在应用启动时调用此函数
 */
export async function initDbConnection(): Promise<void> {
  try {
    // 获取默认的数据库连接（这里假设ID为1的连接是默认连接）
    const defaultConn = await getDbConnById(1);
    
    if (!defaultConn) {
      console.warn('未找到默认数据库连接，请先创建数据库连接');
      return;
    }
    
    // 将连接信息写入.env文件
    await writeDbConnToEnv(defaultConn);
    
    console.log('数据库连接初始化完成');
  } catch (error) {
    console.error('初始化数据库连接失败:', error);
  }
} 