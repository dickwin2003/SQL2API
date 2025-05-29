declare module 'oracledb' {
  interface Connection {
    execute(sql: string, params?: any, options?: any): Promise<any>;
    close(): Promise<void>;
    getConnectionId(): number;
  }

  interface ResultSet {
    metaData?: Array<{name: string}>;
    rows?: any[];
  }

  const getConnection: (config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) => Promise<Connection>;
}
