import { defineEventHandler, createError, getQuery } from "h3";
import db from "../../utils/db";

/**
 * 获取API调用日志
 * 支持分页和多条件筛选（路由ID、状态码、IP地址、时间范围）
 */
export default defineEventHandler(async (event) => {
  // 安全检查 - 这里应添加实际的认证检查
  // TODO: 实现管理员认证

  try {
    const query = getQuery(event);
    console.log("收到API日志查询请求，参数:", query);

    // 分页参数
    const limit = Number(query.limit) || 50; // 默认每页50条
    const offset = Number(query.offset) || 0;

    // 筛选参数
    const routeId = query.routeId ? Number(query.routeId) : null;
    const status = query.status ? String(query.status) : null;
    const ipAddress = query.ipAddress ? String(query.ipAddress) : null;
    const startDate = query.startDate ? String(query.startDate) : null;
    const endDate = query.endDate ? String(query.endDate) : null;

    // 构建查询条件
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (routeId) {
      whereConditions.push("l.route_id = ?");
      params.push(routeId);
    }

    if (status) {
      // 处理状态码范围
      if (status === "200") {
        whereConditions.push("l.response_status >= 200 AND l.response_status < 300");
      } else if (status === "400") {
        whereConditions.push("l.response_status >= 400 AND l.response_status < 500");
      } else if (status === "500") {
        whereConditions.push("l.response_status >= 500");
      } else {
        whereConditions.push("l.response_status = ?");
        params.push(Number(status));
      }
    }

    if (ipAddress) {
      whereConditions.push("l.ip_address LIKE ?");
      params.push(`%${ipAddress}%`);
    }

    if (startDate) {
      whereConditions.push("l.created_at >= ?");
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push("l.created_at <= ?");
      params.push(endDate);
    }

    // 组合WHERE子句
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(" AND ")}` 
      : "";

    console.log("构建的WHERE子句:", whereClause);
    console.log("查询参数:", params);

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
    
    console.log("执行日志查询:", logsQuery);
    const logs = await db.all(logsQuery, queryParams);
    console.log(`查询到 ${logs.length} 条日志记录`);

    // 获取总记录数
    const countResult = await db.get(countQuery, params);
    const total = countResult?.total || 0;
    console.log(`总记录数: ${total}`);

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
