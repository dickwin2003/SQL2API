-- 添加数据库连接ID字段到api_routes表
ALTER TABLE api_routes ADD COLUMN connection_id INTEGER;

-- 创建外键约束
ALTER TABLE api_routes ADD CONSTRAINT fk_api_routes_connection_id 
FOREIGN KEY (connection_id) REFERENCES db_conns(id) ON DELETE CASCADE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_api_routes_connection_id ON api_routes(connection_id); 