import { defineEventHandler, createError, getQuery } from "h3";
import db from "../../utils/db";

/**
 * 获取API调用日志
 * 支持分页和按路由筛选
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const query = getQuery(event);

    // 分页参数
    const limit = Number(query.limit) || 50; // 默认每页50条
    const offset = Number(query.offset) || 0;

    // 路由ID筛选（可选）
    const routeId = query.routeId ? Number(query.routeId) : null;

    // 构建查询条件
    let whereClause = "";
    const params: any[] = [];

    if (routeId) {
      whereClause = "WHERE l.route_id = ?";
      params.push(routeId);
    }

    // 查询API日志，关联路由和用户信息
    const logsQuery = `
      SELECT 
        l.*,
        r.path as route_path,
        r.method as route_method,
        u.username as user_name
      FROM api_logs l
      LEFT JOIN api_routes r ON l.route_id = r.id
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM api_logs l
      ${whereClause}
    `;

    // 执行查询
    const queryParams = [...params];
    queryParams.push(limit, offset);
    
    const logs = await db.all(logsQuery, queryParams);

    // 获取总记录数
    const countResult = await db.get(countQuery, params);
    const total = countResult?.total || 0;

    // 获取所有路由用于筛选
    const routes = await db.all(`
      SELECT id, name, path, method
      FROM api_routes
      ORDER BY name
    `);

    return {
      success: true,
      logs: logs,
      routes: routes,
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
