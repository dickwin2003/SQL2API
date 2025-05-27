-- 创建数据库连接配置表
CREATE TABLE IF NOT EXISTS db_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    database_name TEXT NOT NULL,
    db_type TEXT NOT NULL,  -- mysql, postgresql, sqlserver, etc.
    is_active BOOLEAN DEFAULT TRUE,
    connection_string TEXT,  -- 可选的连接字符串，用于特殊配置
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_connected_at TIMESTAMP,
    connection_status TEXT,  -- success, failed, etc.
    notes TEXT
);

-- 创建连接测试日志表
CREATE TABLE IF NOT EXISTS db_connection_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id INTEGER NOT NULL,
    status TEXT NOT NULL,  -- success, failed
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES db_connections(id) ON DELETE CASCADE
);

-- 添加示例连接
INSERT INTO db_connections (
    name, host, port, username, password, 
    database_name, db_type, is_active
) VALUES 
    ('本地MySQL', '127.0.0.1', 3306, 'root', 'password123', 'test_db', 'mysql', TRUE),
    ('开发PostgreSQL', 'dev-db.example.com', 5432, 'dev_user', 'dev_pass', 'dev_db', 'postgresql', TRUE),
    ('生产SQL Server', 'prod-db.example.com', 1433, 'prod_user', 'prod_pass', 'prod_db', 'sqlserver', FALSE);
