/*
 Navicat Premium Dump SQL

 Source Server         : sql2api
 Source Server Type    : SQLite
 Source Server Version : 3045000 (3.45.0)
 Source Schema         : main

 Target Server Type    : SQLite
 Target Server Version : 3045000 (3.45.0)
 File Encoding         : 65001

 Date: 29/05/2025 14:42:14
*/

PRAGMA foreign_keys = false;

-- ----------------------------
-- Table structure for products
-- ----------------------------
DROP TABLE IF EXISTS "products";
CREATE TABLE "products" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "category" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------
-- Records of products
-- ----------------------------
INSERT INTO "products" VALUES (1, '笔记本电脑', '高性能笔记本电脑', 5999.99, 50, '电子产品', '2025-05-26 12:55:09', '2025-05-26 12:55:09');
INSERT INTO "products" VALUES (2, '智能手机', '最新款智能手机', 3999.99, 100, '电子产品', '2025-05-26 12:55:09', '2025-05-26 12:55:09');
INSERT INTO "products" VALUES (3, '无线耳机', '降噪无线耳机', 899.99, 200, '配件', '2025-05-26 12:55:09', '2025-05-26 12:55:09');
INSERT INTO "products" VALUES (4, '鼠标', '游戏鼠标', 299.99, 150, '配件', '2025-05-26 12:55:09', '2025-05-26 12:55:09');
INSERT INTO "products" VALUES (5, '显示器', '27英寸4K显示器', 1999.99, 30, '电子产品', '2025-05-26 12:55:09', '2025-05-26 12:55:09');

-- ----------------------------
-- Auto increment value for products
-- ----------------------------
UPDATE "sqlite_sequence" SET seq = 5 WHERE name = 'products';

PRAGMA foreign_keys = true;
