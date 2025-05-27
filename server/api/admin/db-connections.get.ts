import { defineEventHandler, createError, getQuery } from "h3";
import db from "../../utils/db";

/**
 * 获取所有数据库连接配置
 * 支持分页和搜索
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const query = getQuery(event);

    // 分页参数
    const limit = Number(query.limit) || 50; // 默认每页50条
    const offset = Number(query.offset) || 0;
    
    // 搜索参数
    const search = query.search as string || '';
    const dbType = query.dbType as string || '';
    const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined;

    // 构建查询条件
    let whereClause = '';
    const params: any[] = [];

    const conditions: string[] = [];
    
    if (search) {
      conditions.push("(name LIKE ? OR host LIKE ? OR database_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (dbType) {
      conditions.push("db_type = ?");
      params.push(dbType);
    }
    
    if (isActive !== undefined) {
      conditions.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      whereClause = "WHERE " + conditions.join(" AND ");
    }

    // 查询数据库连接
    const connectionsQuery = `
      SELECT 
        id, name, host, port, username, 
        '******' as password, 
        database_name, db_type, is_active,
        created_at, updated_at, last_connected_at,
        connection_status, notes
      FROM db_conns
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM db_conns
      ${whereClause}
    `;

    // 执行查询
    const queryParams = [...params];
    queryParams.push(limit, offset);
    
    const connections = await db.all(connectionsQuery, queryParams);

    // 获取总记录数
    const countResult = await db.get(countQuery, params);
    const total = countResult?.total || 0;

    // 获取所有数据库类型用于筛选
    const dbTypes = await db.all(`
      SELECT DISTINCT db_type 
      FROM db_conns 
      ORDER BY db_type
    `);

    return {
      success: true,
      connections: connections,
      dbTypes: dbTypes.map(item => item.db_type),
      meta: {
        total,
        limit,
        offset,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: `服务器错误: ${error.message || "未知错误"}`,
    });
  }
});
