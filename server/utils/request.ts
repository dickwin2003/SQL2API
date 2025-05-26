import { H3Event } from "h3";

/**
 * 获取客户端真实IP地址
 */
export function getClientIP(event: H3Event): string {
  // 从各种头部中获取IP
  const forwardedIP = event.node.req.headers["x-forwarded-for"];
  if (forwardedIP) {
    return Array.isArray(forwardedIP)
      ? forwardedIP[0]
      : forwardedIP.split(",")[0].trim();
  }

  const realIP = event.node.req.headers["x-real-ip"];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  // 最后的备选项
  return event.node.req.socket?.remoteAddress || "未知";
}

/**
 * 获取请求元数据
 */
export function getRequestMeta(event: H3Event): Record<string, any> {
  const meta: Record<string, any> = {
    ip: getClientIP(event),
    userAgent: null,
    referer: null,
    requestTime: new Date().toISOString(),
  };

  // 获取通用请求头信息
  const headers = event.node.req.headers;
  meta.userAgent = headers["user-agent"] || null;
  meta.referer = headers["referer"] || null;

  return meta;
}

/**
 * 获取请求头信息
 */
export function getRequestHeader(
  event: H3Event,
  headerName: string
): string | null {
  const header = event.node.req.headers[headerName.toLowerCase()];
  if (header) {
    return Array.isArray(header) ? header[0] : header;
  }
  return null;
}

/**
 * 从运行时配置或环境变量中获取变量值
 */
export function getEnvVariable(
  event: H3Event,
  key: string,
  defaultValue: string = ""
): string {
  // 从运行时配置中获取
  const config = useRuntimeConfig();
  // @ts-ignore - 运行时配置是动态的
  const configValue = config[key];
  if (configValue !== undefined && configValue !== null)
    return String(configValue);

  // 从环境变量中获取
  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== null) return envValue;

  // 如果都没有，返回默认值
  return defaultValue;
}
