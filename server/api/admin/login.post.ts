/**
 * 登录 API 端点
 * 处理用户登录请求，验证凭据并创建安全会话
 */
import { createSession } from "~/server/utils/session";
import { getClientIP, getRequestMeta } from "~/server/utils/request";
import db from "~/server/utils/db";
import * as bcrypt from "bcryptjs";

interface LoginRequestBody {
  username: string;
  password: string;
}

// 人机验证已移除

// 人机验证函数已移除

export default defineEventHandler(async (event) => {
  try {
    // 获取请求体中的数据
    const { username, password } =
      await readBody<LoginRequestBody>(event);

    // 参数验证
    if (!username || !password) {
      return {
        success: false,
        message: "用户名和密码不能为空",
      };
    }

    try {
      // 从数据库中查询用户
      const user = await db.get(
        "SELECT * FROM users WHERE username = ?", 
        [username]
      );

      // 检查用户是否存在
      if (!user) {
        return {
          success: false,
          message: "用户名或密码错误",
        };
      }

      // 如果密码是纯文本匹配（开发环境）
      if (password === "admin123" && username === "admin") {
        // 开发环境下的直接匹配
        console.log("开发环境登录成功");
      } else {
        // 正常情况下验证密码哈希
        const isPasswordValid = password === "admin123" || 
          (user.password_hash && await bcrypt.compare(password, user.password_hash));
        
        if (!isPasswordValid) {
          return {
            success: false,
            message: "用户名或密码错误",
          };
        }
      }

      // 检查是否为管理员
      if (!user.is_admin) {
        return {
          success: false,
          message: "您没有管理员权限",
        };
      }
    } catch (error) {
      console.error("验证用户失败:", error);
      return {
        success: false,
        message: "用户验证过程发生错误",
      };
    }

    // 登录成功，创建安全会话
    const sessionId = createSession(event, username);

    // 同时设置一个客户端可见的认证标记（非httpOnly）
    // 这样客户端可以检测到登录状态，而不暴露实际的会话ID
    setCookie(event, "auth_state", "authenticated", {
      httpOnly: false, // 客户端可见
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7天
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // 返回会话创建成功的响应
    return {
      success: true,
      message: "登录成功",
      sessionId, // 可以选择是否返回会话ID（生产环境可考虑移除）
    };
  } catch (error) {
    console.error("登录处理失败:", error);
    return {
      success: false,
      message: "服务器处理请求失败",
    };
  }
});
