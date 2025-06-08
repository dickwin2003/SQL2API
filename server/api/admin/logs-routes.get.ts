import { defineEventHandler, createError } from "h3";
import db from "../../utils/db";

/**
 * 获取API调用日志的路由列表
 * 返回所有API路由信息，用于日志筛选
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    // 查询所有API路由
    const routesQuery = `
      SELECT 
        id,
        name,
        path,
        method,
        created_at,
        updated_at
      FROM api_routes
      ORDER BY name ASC
    `;

    const routes = await db.all(routesQuery);

    // 查询每个路由的调用统计
    const routeStatsQuery = `
      SELECT 
        r.id as route_id,
        r.name as route_name,
        r.path as route_path,
        r.method as route_method,
        COUNT(l.id) as call_count,
        AVG(l.execution_time) as avg_execution_time,
        MAX(l.execution_time) as max_execution_time,
        MIN(l.execution_time) as min_execution_time,
        SUM(CASE WHEN l.response_status >= 200 AND l.response_status < 300 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN l.response_status >= 400 THEN 1 ELSE 0 END) as error_count,
        MAX(l.created_at) as last_called_at
      FROM api_routes r
      LEFT JOIN api_logs l ON r.id = l.route_id
      GROUP BY r.id
      ORDER BY call_count DESC
    `;

    const routeStats = await db.all(routeStatsQuery);

    // 获取总体统计信息
    const overallStatsQuery = `
      SELECT 
        COUNT(*) as total_calls,
        AVG(execution_time) as avg_execution_time,
        SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count
      FROM api_logs
    `;

    const overallStats = await db.get(overallStatsQuery);

    // 获取最近的调用趋势（按天统计）
    const trendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as call_count
      FROM api_logs
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const trends = await db.all(trendQuery);

    return {
      success: true,
      routes: routes,  // 添加routes字段，用于前端下拉选择框
      routeStats: routeStats,
      overallStats: overallStats,
      trends: trends
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
