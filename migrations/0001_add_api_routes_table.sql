-- 创建API路由表
CREATE TABLE IF NOT EXISTS api_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    connection_id INTEGER NOT NULL, -- 添加数据库连接ID
    sql_query TEXT NOT NULL,
    params TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    require_auth BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES db_conns(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_api_routes_path ON api_routes(path);
CREATE INDEX IF NOT EXISTS idx_api_routes_method ON api_routes(method);
CREATE INDEX IF NOT EXISTS idx_api_routes_connection_id ON api_routes(connection_id); 