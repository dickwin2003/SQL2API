import { defineEventHandler, createError, getQuery } from "h3";
import db from "../../utils/db";

/**
 * 获取特定API路由的调用日志
 * 支持分页查询
 * 访问路径: /api/admin/logs/route/:id
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    // 从URL中提取路由ID
    const url = event.node.req.url || "";
    const matches = url.match(/\/api\/admin\/logs\/route\/(\d+)/);
    const id = matches ? matches[1] : null;
    const query = getQuery(event);

    if (!id || isNaN(Number(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: "路由ID无效",
      });
    }

    const routeId = Number(id);

    // 分页参数
    const limit = Number(query.limit) || 20; // 默认每页20条
    const offset = Number(query.offset) || 0;

    // 检查路由是否存在
    const route = await db.get(
      `SELECT id, name, path, method FROM api_routes WHERE id = ?`,
      [routeId]
    );

    if (!route) {
      throw createError({
        statusCode: 404,
        statusMessage: "API路由不存在",
      });
    }

    // 查询特定路由的日志
    const logsQuery = `
      SELECT 
        l.*,
        r.path as route_path,
        r.method as route_method,
        r.name as route_name
      FROM api_logs l
      LEFT JOIN api_routes r ON l.route_id = r.id
      WHERE l.route_id = ?
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;

    // 获取总记录数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM api_logs
      WHERE route_id = ?
    `;

    // 执行查询
    const logs = await db.all(logsQuery, [routeId, limit, offset]);
    const countResult = await db.get(countQuery, [routeId]);
    const total = countResult?.total || 0;

    // 获取路由的统计信息
    const statsQuery = `
      SELECT 
        COUNT(*) as total_calls,
        AVG(execution_time) as avg_execution_time,
        MAX(execution_time) as max_execution_time,
        MIN(execution_time) as min_execution_time,
        SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count,
        MAX(created_at) as last_called_at
      FROM api_logs
      WHERE route_id = ?
    `;

    const stats = await db.get(statsQuery, [routeId]);

    return {
      success: true,
      route: route,
      logs: logs,
      stats: stats,
      meta: {
        total,
        limit,
        offset,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    console.error("获取路由日志失败:", error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: `服务器错误: ${error.message || "未知错误"}`,
    });
  }
});
