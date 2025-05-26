/**
 * 数据库类型定义
 */
type Database = any;

// 表字段类型接口
export interface TableField {
  name: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  default_value?: string;
  primary_key?: boolean;
  unique_field?: boolean;
  auto_increment?: boolean;
  description?: string;
  order_index: number;
}

// 表结构接口
export interface TableSchema {
  name: string;
  description?: string;
  fields: TableField[];
}

/**
 * CRUD生成器类
 * 用于生成表结构SQL和CRUD API
 */
export class CrudGenerator {
  /**
   * 生成创建表的SQL语句
   */
  static generateCreateTableSQL(schema: TableSchema): string {
    // 验证表名
    if (!schema.name || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(schema.name)) {
      throw new Error("表名无效，必须以字母开头，且只能包含字母、数字和下划线");
    }

    // 验证是否有字段
    if (!schema.fields || schema.fields.length === 0) {
      throw new Error("表必须包含至少一个字段");
    }

    // 排序字段，确保按order_index排序
    const sortedFields = [...schema.fields].sort(
      (a, b) => a.order_index - b.order_index
    );

    // 生成字段定义
    const fieldDefinitions = sortedFields.map((field) => {
      // 验证字段名
      if (!field.name || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
        throw new Error(
          `字段名 "${field.name}" 无效，必须以字母开头，且只能包含字母、数字和下划线`
        );
      }

      // 基本字段定义
      let definition = `${field.name} ${this.getSQLType(field)}`;

      // 添加约束
      if (field.primary_key) {
        definition += " PRIMARY KEY";
        if (field.auto_increment) {
          definition += " AUTOINCREMENT";
        }
      } else {
        if (field.unique_field) {
          definition += " UNIQUE";
        }
        if (field.nullable === false) {
          definition += " NOT NULL";
        }
        if (
          field.default_value !== undefined &&
          field.default_value !== null &&
          field.default_value !== ""
        ) {
          definition += ` DEFAULT ${this.formatDefaultValue(
            field.default_value,
            field.type
          )}`;
        }
      }

      return definition;
    });

    // 确保字段定义非空
    if (fieldDefinitions.length === 0) {
      throw new Error("无法生成字段定义");
    }

    // 返回SQL，确保括号正确闭合
    return `CREATE TABLE IF NOT EXISTS ${schema.name} (
  ${fieldDefinitions.join(",\n  ")}
);`;
  }

  /**
   * 获取SQL字段类型
   */
  private static getSQLType(field: TableField): string {
    // SQLite支持的类型: TEXT, INTEGER, REAL, BLOB, NUMERIC
    switch (field.type.toLowerCase()) {
      case "string":
      case "text":
      case "varchar":
      case "char":
        return "TEXT";
      case "integer":
      case "int":
      case "smallint":
      case "bigint":
        return "INTEGER";
      case "float":
      case "real":
      case "double":
        return "REAL";
      case "blob":
      case "binary":
        return "BLOB";
      case "boolean":
        return "INTEGER"; // SQLite中布尔值使用INTEGER表示
      case "date":
      case "time":
      case "datetime":
      case "timestamp":
        return "TEXT"; // SQLite中日期使用TEXT表示
      case "decimal":
      case "numeric":
        return "NUMERIC";
      default:
        return "TEXT"; // 默认使用TEXT类型
    }
  }

  /**
   * 格式化默认值
   */
  private static formatDefaultValue(value: string, type: string): string {
    // 根据字段类型格式化默认值
    switch (type.toLowerCase()) {
      case "string":
      case "text":
      case "varchar":
      case "char":
      case "date":
      case "time":
      case "datetime":
      case "timestamp":
        // 为字符串类型添加引号
        return `'${value.replace(/'/g, "''")}'`;
      case "boolean":
        // 布尔值转为0或1
        return value.toLowerCase() === "true" ? "1" : "0";
      default:
        // 数字和其他类型直接返回
        return value;
    }
  }

  /**
   * 生成插入记录的SQL语句
   */
  static generateInsertSQL(schema: TableSchema): string {
    // 过滤掉自增主键字段
    const fields = schema.fields.filter(
      (f) => !(f.primary_key && f.auto_increment)
    );

    const fieldNames = fields.map((f) => f.name).join(", ");
    const placeholders = fields.map((f) => `:${f.name}`).join(", ");

    return `INSERT INTO ${schema.name} (${fieldNames})
VALUES (${placeholders})
RETURNING *;`;
  }

  /**
   * 生成查询所有记录的SQL语句
   */
  static generateSelectAllSQL(schema: TableSchema): string {
    return `SELECT * FROM ${schema.name} ORDER BY id DESC LIMIT :limit OFFSET :offset;`;
  }

  /**
   * 生成查询记录总数的SQL语句
   */
  static generateCountSQL(schema: TableSchema): string {
    return `SELECT COUNT(*) as total FROM ${schema.name};`;
  }

  /**
   * 生成查询单个记录的SQL语句
   */
  static generateSelectByIdSQL(schema: TableSchema): string {
    // 查找主键字段
    const primaryKey = schema.fields.find((f) => f.primary_key) || {
      name: "id",
    };
    return `SELECT * FROM ${schema.name} WHERE ${primaryKey.name} = :id;`;
  }

  /**
   * 生成更新记录的SQL语句
   */
  static generateUpdateSQL(schema: TableSchema): string {
    // 查找主键字段
    const primaryKey = schema.fields.find((f) => f.primary_key) || {
      name: "id",
    };

    // 过滤掉主键字段
    const fields = schema.fields.filter((f) => !f.primary_key);

    const setClause = fields.map((f) => `${f.name} = :${f.name}`).join(", ");

    return `UPDATE ${schema.name}
SET ${setClause}, updated_at = CURRENT_TIMESTAMP
WHERE ${primaryKey.name} = :id
RETURNING *;`;
  }

  /**
   * 生成删除记录的SQL语句
   */
  static generateDeleteSQL(schema: TableSchema): string {
    // 查找主键字段
    const primaryKey = schema.fields.find((f) => f.primary_key) || {
      name: "id",
    };

    return `DELETE FROM ${schema.name} WHERE ${primaryKey.name} = :id;`;
  }

  /**
   * 生成搜索记录的SQL语句
   */
  static generateSearchSQL(schema: TableSchema): string {
    // 查找可搜索的文本字段
    const searchableFields = schema.fields.filter((f) =>
      ["string", "text", "varchar", "char"].includes(f.type.toLowerCase())
    );

    // 如果没有可搜索字段，返回默认查询
    if (searchableFields.length === 0) {
      return this.generateSelectAllSQL(schema);
    }

    // 创建搜索条件
    const searchConditions = searchableFields
      .map((f) => `${f.name} LIKE :query`)
      .join(" OR ");

    return `SELECT * FROM ${schema.name}
WHERE ${searchConditions}
ORDER BY id DESC LIMIT :limit OFFSET :offset;`;
  }

  /**
   * 创建CRUD API路由
   */
  static async createCrudApiRoutes(
    db: Database,
    tableId: number,
    schema: TableSchema
  ): Promise<number[]> {
    const routeIds: number[] = [];

    // 生成API路由
    const routes = [
      // 获取所有记录
      {
        name: `获取所有${schema.name}`,
        path: `/api/${schema.name}`,
        method: "GET",
        sql_query: this.generateSelectAllSQL(schema),
        description: `获取所有${schema.name}记录，支持分页`,
        params: JSON.stringify({
          limit: {
            type: "number",
            required: false,
            description: "每页记录数量，默认20",
          },
          offset: {
            type: "number",
            required: false,
            description: "偏移量，默认0",
          },
        }),
        is_public: false,
        require_auth: true,
        source_table_id: tableId,
        crud_operation: "READ_ALL",
      },

      // 获取单个记录
      {
        name: `获取单个${schema.name}`,
        path: `/api/${schema.name}/:id`,
        method: "GET",
        sql_query: this.generateSelectByIdSQL(schema),
        description: `根据ID获取单个${schema.name}记录`,
        params: JSON.stringify({
          id: { type: "number", required: true, description: "记录ID" },
        }),
        is_public: false,
        require_auth: true,
        source_table_id: tableId,
        crud_operation: "READ_ONE",
      },

      // 创建记录
      {
        name: `创建${schema.name}`,
        path: `/api/${schema.name}`,
        method: "POST",
        sql_query: this.generateInsertSQL(schema),
        description: `创建新的${schema.name}记录`,
        params: this.generateParamsForFields(schema.fields),
        is_public: false,
        require_auth: true,
        source_table_id: tableId,
        crud_operation: "CREATE",
      },

      // 更新记录
      {
        name: `更新${schema.name}`,
        path: `/api/${schema.name}/:id`,
        method: "PUT",
        sql_query: this.generateUpdateSQL(schema),
        description: `更新${schema.name}记录`,
        params: this.generateParamsForUpdate(schema.fields),
        is_public: false,
        require_auth: true,
        source_table_id: tableId,
        crud_operation: "UPDATE",
      },

      // 删除记录
      {
        name: `删除${schema.name}`,
        path: `/api/${schema.name}/:id`,
        method: "DELETE",
        sql_query: this.generateDeleteSQL(schema),
        description: `删除${schema.name}记录`,
        params: JSON.stringify({
          id: { type: "number", required: true, description: "要删除的记录ID" },
        }),
        is_public: false,
        require_auth: true,
        source_table_id: tableId,
        crud_operation: "DELETE",
      },

      // 搜索记录
      {
        name: `搜索${schema.name}`,
        path: `/api/${schema.name}/search`,
        method: "GET",
        sql_query: this.generateSearchSQL(schema),
        description: `搜索${schema.name}记录`,
        params: JSON.stringify({
          query: {
            type: "string",
            required: true,
            description: "搜索关键词，格式: %关键词%",
          },
          limit: {
            type: "number",
            required: false,
            description: "每页记录数量，默认20",
          },
          offset: {
            type: "number",
            required: false,
            description: "偏移量，默认0",
          },
        }),
        is_public: false,
        require_auth: true,
        source_table_id: tableId,
        crud_operation: "SEARCH",
      },
    ];

    // 插入API路由
    for (const route of routes) {
      try {
        const result = await db.get(
          `INSERT INTO api_routes 
            (name, description, path, method, sql_query, params, is_public, require_auth, source_table_id, crud_operation) 
          VALUES 
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
          [
            route.name,
            route.description,
            route.path,
            route.method,
            route.sql_query,
            route.params,
            route.is_public ? 1 : 0,
            route.require_auth ? 1 : 0,
            route.source_table_id,
            route.crud_operation
          ]
        );

        if (result && result.id) {
          routeIds.push(result.id);
        }
      } catch (error) {
        console.error(`Error creating route ${route.name}:`, error);
      }
    }

    return routeIds;
  }

  /**
   * 为字段生成参数配置
   */
  private static generateParamsForFields(fields: TableField[]): string {
    // 过滤掉自增主键字段
    const filteredFields = fields.filter(
      (f) => !(f.primary_key && f.auto_increment)
    );

    // 生成参数配置
    const params: Record<string, any> = {};

    filteredFields.forEach((field) => {
      params[field.name] = {
        type: this.getParamType(field.type),
        required: field.nullable === false && field.default_value === undefined,
        description: field.description || `${field.name}字段`,
      };
    });

    return JSON.stringify(params);
  }

  /**
   * 为更新操作生成参数配置
   */
  private static generateParamsForUpdate(fields: TableField[]): string {
    // 生成参数配置，包括ID
    const params: Record<string, any> = {
      id: {
        type: "number",
        required: true,
        description: "记录ID",
      },
    };

    // 添加其他字段参数
    fields.forEach((field) => {
      // 跳过主键字段
      if (!field.primary_key) {
        params[field.name] = {
          type: this.getParamType(field.type),
          required: false, // 更新操作中所有字段都是可选的
          description: field.description || `${field.name}字段`,
        };
      }
    });

    return JSON.stringify(params);
  }

  /**
   * 获取参数类型
   */
  private static getParamType(fieldType: string): string {
    // 将数据库字段类型转换为API参数类型
    switch (fieldType.toLowerCase()) {
      case "integer":
      case "int":
      case "smallint":
      case "bigint":
      case "float":
      case "real":
      case "double":
      case "decimal":
      case "numeric":
        return "number";
      case "boolean":
        return "boolean";
      default:
        return "string";
    }
  }
}
