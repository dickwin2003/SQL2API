// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  ssr: false,
  
  nitro: {
    preset: "node-server",
    experimental: {
      asyncContext: true
    },
    externals: {
      external: ['sqlite3', 'mysql2', 'pg', 'tedious']
    },
    devServer: {
      host: '0.0.0.0',
      port: 3001
    },
    moduleSideEffects: ['sqlite3'],
    output: {
      serverDir: '.output/server'
    }
  },

  vite: {
    build: {
      sourcemap: false,
    },
    optimizeDeps: {
      exclude: ['sqlite3']
    },
    server: {
      fs: {
        strict: true
      }
    }
  },

  app: {
    baseURL: '/',
    head: {
      title: "SQL to API - SQLite",
      meta: [
        {
          "http-equiv": "Content-Security-Policy",
          content: "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';",
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
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "mask-icon", href: "/safari-pinned-tab.svg", color: "#409EFF" },
      ],
    },
  },

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

  plugins: [
    { src: '~/plugins/element-zindex.client.ts', mode: 'client' }
  ],

  experimental: {
    payloadExtraction: false
  }
});
