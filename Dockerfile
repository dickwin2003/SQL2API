# 使用Node.js 20作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 配置npm使用阿里云镜像
RUN npm config set registry https://registry.npmmirror.com

# 复制package.json和package-lock.json
COPY package.json package-lock.json ./

# 安装依赖
RUN npm install --legacy-peer-deps --registry=https://registry.npmmirror.com

# 复制所有文件
COPY . .

# 构建应用
RUN NODE_ENV=production npm run build && \
    npm cache clean --force

# 确保构建成功
RUN if [ ! -f ".output/server/index.mjs" ]; then \
      echo "构建失败，.output/server/index.mjs 不存在" && exit 1; \
    fi

# 确保文件权限正确
RUN chmod -R 755 /app/.output

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 启动应用 - 直接使用挂载的数据库文件，不进行初始化
CMD ["node", ".output/server/index.mjs"]

# 注意：需要在运行容器时挂载SQLite数据库文件
# 运行命令示例：docker run -d -p 3000:3000 -v D:/home/dockerdata/meta/meta.db:/app/data/sql2api.db --name sql2api sql2api:latest
