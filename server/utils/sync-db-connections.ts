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
    
    // Always update the db-config.ts file to ensure synchronization
    await updateDbConfigFile(existingConnections);
    
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
 * \u8fd9\u4e2a\u6587\u4ef6\u7528\u4e8e\u5b58\u50a8\u6570\u636e\u5e93\u8fde\u63a5\u4fe1\u606f
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
    
    // Generate code for database connections
    let index = 1;
    const dbConnectionsList = [];
    
    // Add connections from the database
    for (const [name, conn] of Object.entries(connections)) {
      // Generate a variable name for the connection
      const varName = `db${index}Connection`;
      
      // Generate the connection code
      newFileContent += `// \u4ece\u6570\u636e\u5e93\u4e2d\u8bfb\u53d6\u7684\u8fde\u63a5${index}\nconst ${varName}: DbConnection = {\n  id: ${conn.id || index},\n  name: '${conn.name}',\n  host: '${conn.host}',\n  port: ${conn.port},\n  username: '${conn.username}',\n  password: '${conn.password}',\n  database_name: '${conn.database_name}',\n  db_type: '${conn.db_type}'${conn.connection_string ? `,\n  connection_string: '${conn.connection_string}'` : ''}\n};\n\n`;
      
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
    
    // Check if the content has actually changed
    if (originalContent.trim() === newFileContent.trim()) {
      console.log('No changes needed to db-config.ts');
      return true;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(configPath, newFileContent, 'utf-8');
    
    console.log(`Updated db-config.ts with ${index - 1} connections from database`);
    return true;
  } catch (error) {
    console.error('Error updating db-config.ts file:', error);
    return false;
  }
}
