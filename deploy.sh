#!/bin/bash

# 构建和部署脚本

set -e

echo "🚀 开始构建和部署 Mihomo Express Backend..."

# 检查 Node.js 版本
echo "📋 检查环境..."
node --version
npm --version

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 运行类型检查
echo "🔍 运行类型检查..."
npm run build

# 运行测试 (如果有)
if [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
  echo "🧪 运行测试..."
  npm test
fi

# 构建生产版本
echo "🏗️  构建生产版本..."
npm run build

# 检查构建结果
if [ ! -d "dist" ]; then
  echo "❌ 构建失败，dist 目录不存在"
  exit 1
fi

echo "✅ 构建完成！"

# 部署选项
echo "📋 选择部署方式："
echo "1. PM2 部署"
echo "2. Docker 部署"
echo "3. 仅构建 (不部署)"

read -p "请选择 (1-3): " choice

case $choice in
  1)
    echo "🚀 使用 PM2 部署..."
    
    # 检查 PM2 是否安装
    if ! command -v pm2 &> /dev/null; then
      echo "📦 安装 PM2..."
      npm install -g pm2
    fi
    
    # 停止现有进程
    pm2 stop mihomo-express-backend || true
    pm2 delete mihomo-express-backend || true
    
    # 启动新进程
    pm2 start ecosystem.config.json
    pm2 save
    pm2 startup
    
    echo "✅ PM2 部署完成!"
    pm2 status
    ;;
    
  2)
    echo "🐳 使用 Docker 部署..."
    
    # 检查 Docker 是否安装
    if ! command -v docker &> /dev/null; then
      echo "❌ Docker 未安装，请先安装 Docker"
      exit 1
    fi
    
    # 构建 Docker 镜像
    docker build -t mihomo-express-backend .
    
    # 停止现有容器
    docker stop mihomo-express-backend || true
    docker rm mihomo-express-backend || true
    
    # 启动新容器
    docker run -d \
      --name mihomo-express-backend \
      --restart unless-stopped \
      -p 3000:3000 \
      -v "$(pwd)/logs:/app/logs" \
      mihomo-express-backend
    
    echo "✅ Docker 部署完成!"
    docker ps | grep mihomo-express-backend
    ;;
    
  3)
    echo "✅ 仅构建完成，未部署"
    ;;
    
  *)
    echo "❌ 无效选择"
    exit 1
    ;;
esac

echo "🎉 部署完成！"
echo "🌐 健康检查: http://localhost:3000/health"
echo "📚 API 文档: 查看 API.md"