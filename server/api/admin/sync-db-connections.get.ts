import { defineEventHandler, createError } from 'h3';
import { syncDatabaseConnections } from '../../utils/sync-db-connections';

/**
 * 同步数据库连接
 * 将db_conns表中的连接同步到db-config.ts文件中
 */
export default defineEventHandler(async (event) => {
  try {
    // 调用同步函数
    const result = await syncDatabaseConnections();
    
    return {
      success: true,
      message: '数据库连接同步成功',
      result
    };
  } catch (error: any) {
    console.error('同步数据库连接失败:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: `服务器错误: ${error.message || '未知错误'}`
    });
  }
});
