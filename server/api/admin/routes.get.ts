import { defineEventHandler, createError, getQuery } from "h3";
import db from "../../utils/db";

/**
 * 获取所有API路由
 * 支持分页和按表筛选
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    // Use local database instance instead of Cloudflare environment
    const query = getQuery(event);

    // 分页参数
    const limit = Number(query.limit) || 10; // 默认每页10条
    const offset = Number(query.offset) || 0;

    // 表ID筛选（可选）
    const tableId = query.tableId ? Number(query.tableId) : null;

    // 构建查询条件
    let whereClause = "";
    const params: any[] = [];

    if (tableId) {
      whereClause = "WHERE r.source_table_id = ?";
      params.push(tableId);
    }

    // 查询API路由，关联表信息
    const routesQuery = `
      SELECT 
        r.*,
        t.name as table_name,
        t.description as table_description
      FROM api_routes r
      LEFT JOIN db_tables t ON r.source_table_id = t.id
      ${whereClause}
      ORDER BY 
        CASE WHEN r.source_table_id IS NULL THEN 1 ELSE 0 END, 
        t.name, 
        r.crud_operation,
        r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM api_routes r
      ${whereClause}
    `;

    // 执行查询
    const queryParams = [...params, limit, offset];
    
    const routes = await db.all(routesQuery, queryParams);

    // 获取总记录数
    const countResult = await db.get(countQuery, params);
    const total = countResult?.total || 0;

    // 获取所有表用于筛选
    const tables = await db.all(
      `
      SELECT id, name, description
      FROM db_tables
      ORDER BY name
      `
    );

    return {
      success: true,
      routes: routes,
      tables: tables,
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
