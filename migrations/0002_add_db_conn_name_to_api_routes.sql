-- 添加数据库连接名称字段到api_routes表
ALTER TABLE api_routes ADD COLUMN db_conn_name TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_api_routes_db_conn_name ON api_routes(db_conn_name);

-- 更新现有记录（如果有）
-- 此处可以添加更新现有记录的SQL语句，如果需要的话
