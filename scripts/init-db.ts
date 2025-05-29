import { initDbConnection } from '../server/utils/init-db-connection';

async function main() {
  console.log('开始初始化数据库连接...');
  await initDbConnection();
  console.log('数据库连接初始化完成');
  process.exit(0);
}

main().catch(error => {
  console.error('初始化失败:', error);
  process.exit(1);
});
