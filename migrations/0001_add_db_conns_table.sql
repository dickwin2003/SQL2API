-- 创建数据库连接表
CREATE TABLE IF NOT EXISTS db_conns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    database_name TEXT NOT NULL,
    db_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    connection_string TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_connected_at TIMESTAMP,
    connection_status TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_db_conns_name ON db_conns(name);
CREATE INDEX IF NOT EXISTS idx_db_conns_db_type ON db_conns(db_type);
CREATE INDEX IF NOT EXISTS idx_db_conns_is_active ON db_conns(is_active);
