# SQL2API - 数据库到API转换工具

这是一个基于Nuxt.js的应用，可以通过配置数据库连接和编写SQL查询快速创建REST API接口。

## 功能特性

- **多数据库支持**: 支持MySQL、Oracle等多种数据库连接
- **SQL转API**: 通过编写SQL语句自动生成REST API
- **API管理**: 创建、编辑、删除API接口
- **API测试**: 内置API测试工具，方便调试
- **调用日志**: 记录API调用历史，便于排查问题
- **表结构管理**: 可视化查看和管理数据库表结构

## 系统截图

登录界面


![登录](https://pub-18e1a8a1f45c4376b321a8f9f29248b8.r2.dev/sql2api/1_login.png)



首页


![首页](https://pub-18e1a8a1f45c4376b321a8f9f29248b8.r2.dev/sql2api/2_main.png)



创建 API


![创建 API 页面](https://pub-18e1a8a1f45c4376b321a8f9f29248b8.r2.dev/sql2api/3_creat_api.png)



表管理


![表管理页面](https://pub-18e1a8a1f45c4376b321a8f9f29248b8.r2.dev/sql2api/4_tabellist.png)



API 列表


![API 列表页面](https://pub-18e1a8a1f45c4376b321a8f9f29248b8.r2.dev/sql2api/5_apilist.png)



API 测试


![API 测试工具页面](https://pub-18e1a8a1f45c4376b321a8f9f29248b8.r2.dev/sql2api/6_apitest.png)



调用日志


![API 调用日志页面](https://pub-18e1a8a1f45c4376b321a8f9f29248b8.r2.dev/sql2api/7_apilog.png)

## 快速开始

### 前提条件

- [Node.js](https://nodejs.org/) (v18或更高版本)
- [pnpm](https://pnpm.io/) 包管理器
- 可用的数据库服务(MySQL/Oracle等)

### 安装

```bash
# 克隆项目
git clone https://github.com/dickwin2003/SQL2API.git
cd SQL2API

# 安装依赖
pnpm install
```

### 配置数据库连接

1. 复制`db-config.ts.example`为`db-config.ts`
2. 编辑`db-config.ts`文件，添加您的数据库连接配置

```typescript
export default {
  connections: [
    {
      name: '生产数据库',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'password',
      database: 'my_db'
    }
  ]
}
```

### 运行项目

```bash
# 开发模式
pnpm dev

# 生产模式
cd /opt/SQL2API
yarn install
yarn build

node .output/server/index.mjs
```

## 使用指南

### 1. 添加数据库连接

1. 登录系统后，进入"数据库连接"页面
2. 点击"添加连接"按钮
3. 填写数据库连接信息并保存

### 2. 创建API接口

1. 进入"创建API"页面
2. 填写API基本信息(名称、路径、描述等)
3. 选择目标数据库连接
4. 编写SQL查询语句
5. 定义参数(可选)
6. 点击"创建"按钮生成API

### 3. 测试API

1. 进入"API测试"页面
2. 选择要测试的API
3. 填写参数(如果有)
4. 点击"发送"按钮测试API
5. 查看返回结果

## API参数定义

在SQL中使用`:参数名`的形式定义参数，例如：

```sql
SELECT * FROM users WHERE id = :userId AND status = :status
```

然后在参数定义部分添加对应参数，指定类型和是否必填。

## 项目结构

```
SQL2API/
├── components/          # 前端组件
├── data/                # 本地SQLite数据库文件
├── migrations/          # 数据库迁移脚本
├── pages/               # 页面路由
│   ├── api-list.vue     # API列表
│   ├── api-logs.vue     # API日志
│   ├── api-tester.vue   # API测试
│   ├── create-api.vue   # 创建API
│   ├── db-connections.vue # 数据库连接管理
│   └── table-management.vue # 表管理
├── plugins/             # Nuxt插件
├── public/              # 静态资源
├── server/              # 服务端API
│   ├── api/             # API路由
│   ├── plugins/         # 服务端插件
│   └── utils/           # 工具函数
├── app.vue              # 应用入口
├── db-config.ts         # 数据库连接配置
├── nuxt.config.ts       # Nuxt配置
└── package.json         # 项目依赖
```

## 技术栈

- **前端**: Vue 3, Nuxt 3, Element Plus
- **后端**: Node.js, SQLite(元数据存储)
- **数据库驱动**: mysql2, postgres
- **构建工具**: Vite

## 注意事项

1. 生产环境请确保添加适当的认证机制
2. 敏感数据库信息请妥善保管
3. 复杂查询建议添加适当的索引优化性能
