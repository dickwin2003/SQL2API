import { H3Event } from 'h3';
import { writeDbConnToEnv } from '~/server/utils/db-connection';
import { getDbConnById } from '~/server/utils/db-manager';

export default defineEventHandler(async (event: H3Event) => {
  try {
    const body = await readBody(event);
    const { connectionId } = body;
    
    if (!connectionId) {
      throw new Error('缺少连接ID');
    }
    
    // 获取数据库连接信息
    const dbConn = await getDbConnById(connectionId);
    if (!dbConn) {
      throw new Error('找不到指定的数据库连接');
    }
    
    // 将连接信息写入.env文件
    await writeDbConnToEnv(dbConn);
    
    return {
      success: true,
      message: '数据库连接已切换'
    };
  } catch (error: any) {
    console.error('切换数据库连接失败:', error);
    return {
      success: false,
      message: error.message || '切换数据库连接失败'
    };
  }
}); 