-- 创建数据库连接日志表
CREATE TABLE IF NOT EXISTS db_connection_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES db_conns(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_db_connection_logs_connection_id ON db_connection_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_db_connection_logs_created_at ON db_connection_logs(created_at); 