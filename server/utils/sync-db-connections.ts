/**
 * Database Connection Synchronization Utility
 * This utility ensures that database connections from db_conns table are synchronized with db-config.ts
 */
import { getAllDbConns } from './db-manager';
import { dbConnections, DbConnection } from '~/db-config';
import fs from 'fs';
import path from 'path';

/**
 * Synchronizes database connections from the database with the connections in memory
 */
export async function syncDatabaseConnections() {
  try {
    console.log('Synchronizing database connections...');
    
    // Get all database connections from the database
    const dbConns = await getAllDbConns();
    
    // Create a map of database connections from the database
    const dbConnsMap = new Map<string, DbConnection>();
    for (const conn of dbConns) {
      dbConnsMap.set(conn.name, conn);
    }
    
    // Get existing connections from the db-config.ts file
    const existingConnections: Record<string, DbConnection> = {};
    
    // Add the built-in connections (these should always be preserved)
    const builtInConnections = ['127_docker', 'stock', 'test110'];
    for (const name of builtInConnections) {
      if (dbConnections[name]) {
        existingConnections[name] = dbConnections[name];
      }
    }
    
    // Add connections from the database
    for (const conn of dbConns) {
      if (!existingConnections[conn.name]) {
        console.log(`Adding connection from database: ${conn.name}`);
        existingConnections[conn.name] = conn;
      } else {
        console.log(`Connection already exists in db-config.ts: ${conn.name}`);
      }
    }
    
    // Check for connections in db-config.ts that no longer exist in the database
    for (const name in dbConnections) {
      // Skip built-in connections
      if (builtInConnections.includes(name)) {
        continue;
      }
      
      // If the connection is not in the database, don't include it
      if (!dbConnsMap.has(name)) {
        console.log(`Removing connection that no longer exists in database: ${name}`);
      } else if (!existingConnections[name]) {
        existingConnections[name] = dbConnections[name];
      }
    }
    
    // Update the in-memory dbConnections object
    Object.keys(dbConnections).forEach(key => {
      delete (dbConnections as any)[key];
    });
    
    Object.entries(existingConnections).forEach(([key, value]) => {
      (dbConnections as any)[key] = value;
    });
    
    // If we have new connections, update the db-config.ts file
    if (hasNewConnections) {
      await updateDbConfigFile(existingConnections);
    }
    
    console.log(`Database connections synchronized. Total connections: ${Object.keys(dbConnections).length}`);
    
    // Log all available connection names for debugging
    console.log('Available connections:', Object.keys(dbConnections).join(', '));
    
    return true;
  } catch (error) {
    console.error('Error synchronizing database connections:', error);
    return false;
  }
}

/**
 * Updates the db-config.ts file with the connections from the database
 * @param connections The connections from the database
 */
async function updateDbConfigFile(connections: Record<string, DbConnection>) {
  try {
    // Get the path to the db-config.ts file
    const configPath = path.resolve(process.cwd(), 'db-config.ts');
    
    // Read the current file content
    const originalContent = fs.readFileSync(configPath, 'utf-8');
    
    // Create a backup of the original file
    const backupPath = configPath + '.backup';
    fs.writeFileSync(backupPath, originalContent, 'utf-8');
    console.log(`Created backup of db-config.ts at ${backupPath}`);
    
    // Start with a clean file
    let newFileContent = '';
    
    // Add the file header and interface definition
    newFileContent += `/**
 * \u6570\u636e\u5e93\u8fde\u63a5\u914d\u7f6e
 * \u8fd9\u4e2a\u6587\u4ef6\u7528\u4e8e\u4ece.env\u6587\u4ef6\u4e2d\u8bfb\u53d6\u6570\u636e\u5e93\u8fde\u63a5\u4fe1\u606f
 */

// \u6570\u636e\u5e93\u8fde\u63a5\u7c7b\u578b
export interface DbConnection {
  id?: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database_name: string;
  db_type: string;
  connection_string?: string;
}

`;
    
    // Add the built-in connections (db1Connection, db2Connection, db3Connection)
    // These are the standard connections that should always be included
    newFileContent += `// \u4ece\u73af\u5883\u53d8\u91cf\u4e2d\u8bfb\u53d6\u6570\u636e\u5e93\u8fde\u63a5\u4fe1\u606f
const db1Connection: DbConnection = {
  id: 1,
  name: process.env.DB1_NAME || '127_docker',
  host: process.env.DB1_HOST || '127.0.0.1',
  port: parseInt(process.env.DB1_PORT || '3306'),
  username: process.env.DB1_USER || 'root',
  password: process.env.DB1_PASSWORD || 'root',
  database_name: process.env.DB1_DATABASE || 'sqlrest',
  db_type: process.env.DB1_TYPE || 'mysql'
};

const db2Connection: DbConnection = {
  id: 2,
  name: process.env.DB2_NAME || 'stock',
  host: process.env.DB2_HOST || '139.196.78.195',
  port: parseInt(process.env.DB2_PORT || '3306'),
  username: process.env.DB2_USER || 'ppg',
  password: process.env.DB2_PASSWORD || 'dickwin2003@gmail.com',
  database_name: process.env.DB2_DATABASE || 'stock_pick',
  db_type: process.env.DB2_TYPE || 'mysql'
};

const db3Connection: DbConnection = {
  id: 3,
  name: process.env.DB3_NAME || 'test110',
  host: process.env.DB3_HOST || '119.91.39.7',
  port: parseInt(process.env.DB3_PORT || '3305'),
  username: process.env.DB3_USER || 'root',
  password: process.env.DB3_PASSWORD || 'root',
  database_name: process.env.DB3_DATABASE || 'dataops45',
  db_type: process.env.DB3_TYPE || 'mysql'
};

`;
    
    // Track connection names to avoid duplicates
    const builtInNames = ['127_docker', 'stock', 'test110'];
    const processedNames = new Set(builtInNames);
    
    // Generate code for database connections
    let index = 4; // Start from db4Connection
    const dbConnectionsList = [];
    
    // Add built-in connections to the dbConnections list
    dbConnectionsList.push('[db1Connection.name]: db1Connection');
    dbConnectionsList.push('[db2Connection.name]: db2Connection');
    dbConnectionsList.push('[db3Connection.name]: db3Connection');
    
    // Add connections from the database
    for (const [name, conn] of Object.entries(connections)) {
      // Skip connections that are already included as built-in
      if (builtInNames.includes(name)) {
        continue;
      }
      
      // Add to processed set
      processedNames.add(name);
      
      // Generate a variable name for the connection
      const varName = `db${index}Connection`;
      
      // Generate the connection code
      newFileContent += `// Added from database: ${name}\nconst ${varName}: DbConnection = {\n  id: ${conn.id || index},\n  name: '${conn.name}',\n  host: '${conn.host}',\n  port: ${conn.port},\n  username: '${conn.username}',\n  password: '${conn.password}',\n  database_name: '${conn.database_name}',\n  db_type: '${conn.db_type}'${conn.connection_string ? `,\n  connection_string: '${conn.connection_string}'` : ''}\n};\n\n`;
      
      // Add to dbConnections list
      dbConnectionsList.push(`[${varName}.name]: ${varName}`);
      
      index++;
    }
    
    // Add the dbConnections export
    newFileContent += '// \u9884\u5b9a\u4e49\u7684\u6570\u636e\u5e93\u8fde\u63a5\nexport const dbConnections: Record<string, DbConnection> = {\n  ' + 
      dbConnectionsList.join(',\n  ') + 
      '\n};\n\n';
    
    // Add the helper functions
    newFileContent += `/**
 * \u6839\u636e\u540d\u79f0\u83b7\u53d6\u6570\u636e\u5e93\u8fde\u63a5\u4fe1\u606f
 * @param name \u8fde\u63a5\u540d\u79f0
 * @returns \u6570\u636e\u5e93\u8fde\u63a5\u4fe1\u606f
 */
export function getDbConnectionByName(name: string): DbConnection | null {
  return dbConnections[name] || null;
}

/**
 * \u6839\u636eID\u83b7\u53d6\u6570\u636e\u5e93\u8fde\u63a5\u4fe1\u606f
 * @param id \u8fde\u63a5ID
 * @returns \u6570\u636e\u5e93\u8fde\u63a5\u4fe1\u606f
 */
export function getDbConnectionById(id: number): DbConnection | null {
  for (const key in dbConnections) {
    if (dbConnections[key].id === id) {
      return dbConnections[key];
    }
  }
  return null;
}

/**
 * \u83b7\u53d6\u6240\u6709\u6570\u636e\u5e93\u8fde\u63a5
 * @returns \u6240\u6709\u6570\u636e\u5e93\u8fde\u63a5\u7684\u6570\u7ec4
 */
export function getAllDbConnections(): DbConnection[] {
  return Object.values(dbConnections);
}
`;
    
    // Write the updated content back to the file
    fs.writeFileSync(configPath, newFileContent, 'utf-8');
    
    console.log(`Updated db-config.ts with ${index - 4} connections from database`);
    return true;
  } catch (error) {
    console.error('Error updating db-config.ts file:', error);
    return false;
  }
}
