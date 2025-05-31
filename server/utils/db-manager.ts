import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

// Enable verbose mode for debugging
sqlite3.verbose();

let db: sqlite3.Database | null = null;

export async function initDatabase(): Promise<sqlite3.Database> {
    if (db) {
        return db;
    }

    return new Promise((resolve, reject) => {
        try {
            // Set up database directory using platform-specific paths
            const rootDir = process.cwd();
            const dataDir = path.join(rootDir, 'data');
            
            // Ensure data directory exists
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            const dbPath = path.join(dataDir, 'meta.db');
            console.log('Initializing database at:', dbPath);
            
            // Create database connection with explicit flags
            db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    console.error('Could not connect to database:', err);
                    reject(err);
                    return;
                }
                
                console.log('Connected to SQLite database');
                
                // Enable foreign keys and WAL mode
                db!.run('PRAGMA foreign_keys = ON');
                db!.run('PRAGMA journal_mode = WAL', function(err) {
                    if (err) {
                        console.warn('Could not set journal mode:', err);
                    }
                    
                    // Create necessary tables
                    const createTableSql = `CREATE TABLE IF NOT EXISTS db_conns (
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
                    )`;
                    
                    db!.run(createTableSql, function(err) {
                        if (err) {
                            console.error('Error creating table:', err);
                            reject(err);
                            return;
                        }
                        
                        // Create indexes
                        db!.run('CREATE INDEX IF NOT EXISTS idx_db_conns_name ON db_conns(name)', function(err) {
                            if (err) {
                                console.warn('Error creating index:', err);
                            }
                            
                            db!.run('CREATE INDEX IF NOT EXISTS idx_db_conns_db_type ON db_conns(db_type)', function(err) {
                                if (err) {
                                    console.warn('Error creating index:', err);
                                }
                                
                                db!.run('CREATE INDEX IF NOT EXISTS idx_db_conns_is_active ON db_conns(is_active)', function(err) {
                                    if (err) {
                                        console.warn('Error creating index:', err);
                                    }
                                    
                                    resolve(db!);
                                });
                            });
                        });
                    });
                });
            });
        } catch (error) {
            console.error('Fatal: Failed to initialize database:', error);
            // Close database if initialization failed
            if (db) {
                try {
                    db.close();
                } catch (closeError) {
                    console.error('Error closing database:', closeError);
                }
                db = null;
            }
            reject(error);
        }
    });
}

export function getDatabase(): sqlite3.Database {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

// Ensure clean shutdown
process.on('SIGINT', () => {
    if (db) {
        try {
            db.close();
        } catch (error) {
            console.error('Error closing database on shutdown:', error);
        }
    }
    process.exit(0);
});

// Database operations with sqlite3 async API
export async function getDbConnById(id: number): Promise<DbConnection | null> {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        database.get('SELECT * FROM db_conns WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row || null);
        });
    });
}

export async function getAllDbConns(): Promise<DbConnection[]> {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        database.all('SELECT * FROM db_conns ORDER BY id DESC', [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows || []);
        });
    });
}

export async function createDbConn(conn: Omit<DbConnection, 'id'>): Promise<DbConnection | null> {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        database.run(
            'INSERT INTO db_conns (name, host, port, username, password, database_name, db_type, connection_string) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [conn.name, conn.host, conn.port, conn.username, conn.password, conn.database_name, conn.db_type, conn.connection_string],
            function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                const lastId = this.lastID;
                if (lastId) {
                    // Get the newly created connection
                    getDbConnById(lastId).then(resolve).catch(reject);
                } else {
                    resolve(null);
                }
            }
        );
    });
}

export async function updateDbConn(id: number, conn: Partial<DbConnection>): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const updates = Object.entries(conn)
            .filter(([key]) => key !== 'id')
            .map(([key]) => `${key} = ?`);
        
        const values = Object.entries(conn)
            .filter(([key]) => key !== 'id')
            .map(([_, value]) => value);

        const query = `UPDATE db_conns SET ${updates.join(', ')} WHERE id = ?`;
        database.run(query, [...values, id], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes > 0);
        });
    });
}

export async function deleteDbConn(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        database.run('DELETE FROM db_conns WHERE id = ?', [id], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes > 0);
        });
    });
}

export interface DbConnection {
    id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database_name: string;
    db_type: string;
    connection_string?: string;
}