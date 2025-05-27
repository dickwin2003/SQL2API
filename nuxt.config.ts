// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  // 运行时配置，用于访问环境变量
  runtimeConfig: {
    // 私有配置（仅在服务端可用）
    adminUsername: process.env.ADMIN_USERNAME,
    adminPassword: process.env.ADMIN_PASSWORD,
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
    // 公共配置（客户端可访问）
    public: {
      // 可在此添加公共环境变量
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY,
    },
  },

  nitro: {
    preset: "node",
    compatibilityDate: '2025-05-27',
    externals: {
      inline: ['mysql2', 'pg', 'better-sqlite3', 'tedious', 'tarn', 'debug', 'bl', 'iconv-lite', 'sprintf-js']
    }
  },

  // 设置vite配置
  vite: {
    build: {
      sourcemap: false,
    },
  },

  // 添加CSP头以允许CDN加载
  app: {
    head: {
      title: "SQL to API - SQLite",
      meta: [
        {
          "http-equiv": "Content-Security-Policy",
          content:
            "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';",
        },
        {
          name: "description",
          content: "将SQL语句转换为API端点，简单快捷的API生成平台",
        },
        { name: "msapplication-TileColor", content: "#409EFF" },
        { name: "theme-color", content: "#409EFF" },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32x32.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/favicon-16x16.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        { rel: "mask-icon", href: "/safari-pinned-tab.svg", color: "#409EFF" },
      ],
    },
  },
});
