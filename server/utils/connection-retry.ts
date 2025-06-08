/**
 * Database Connection Retry Utility
 * 用于处理数据库连接重试逻辑
 */

/**
 * 带有重试逻辑的异步函数包装器
 * @param fn 需要执行的异步函数
 * @param retries 重试次数
 * @param delay 重试延迟(毫秒)
 * @param timeout 连接超时时间(毫秒)
 * @returns 异步函数的结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 2000,
  timeout = 5000
): Promise<T> {
  // 从环境变量读取配置（如果有）
  const maxRetries = process.env.DB_CONNECTION_RETRY ? parseInt(process.env.DB_CONNECTION_RETRY) : retries;
  const retryDelay = process.env.DB_CONNECTION_RETRY_DELAY ? parseInt(process.env.DB_CONNECTION_RETRY_DELAY) : delay;
  const connectionTimeout = process.env.DB_CONNECTION_TIMEOUT ? parseInt(process.env.DB_CONNECTION_TIMEOUT) : timeout;

  // 创建一个带超时的Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`连接超时(${connectionTimeout}ms)`)), connectionTimeout);
  });

  // 重试逻辑
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 如果不是第一次尝试，则等待指定的延迟时间
      if (attempt > 0) {
        console.log(`尝试重新连接 (${attempt}/${maxRetries})，等待${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      // 使用Promise.race来实现超时功能
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 检查是否是ECONNRESET错误
      if (error instanceof Error && 'code' in error && (error as any).code === 'ECONNRESET') {
        console.warn(`连接被重置(ECONNRESET)，尝试重新连接...`);
      } else {
        console.error(`连接错误: ${lastError.message}`);
      }
      
      // 如果已经达到最大重试次数，则抛出最后一个错误
      if (attempt === maxRetries) {
        console.error(`达到最大重试次数(${maxRetries})，放弃连接`);
        throw lastError;
      }
    }
  }

  // 这行代码理论上不会执行，但TypeScript需要一个返回值
  throw lastError || new Error('未知连接错误');
}
