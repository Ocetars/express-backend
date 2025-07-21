# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖，构建时需要）
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

WORKDIR /app

# 安装 dumb-init 和 curl（用于健康检查）
RUN apk add --no-cache dumb-init curl

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# 复制 package 文件并安装生产依赖
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制构建文件
COPY --from=builder /app/dist ./dist

# 创建日志目录
RUN mkdir -p logs && chown -R nodeuser:nodejs logs

# 切换到非 root 用户
USER nodeuser

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]