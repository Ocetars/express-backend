# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 开发命令

- `npm run dev` - 使用 ts-node-dev 启动带热重载的开发服务器
- `npm run build` - 将 TypeScript 编译为 JavaScript 到 `dist/` 目录
- `npm start` - 从构建文件启动生产服务器
- `npm test` - 运行 Jest 测试

## 架构

这是一个 TypeScript Express.js 后端，提供用于从 Mihomo API（星穹铁道游戏数据）获取玩家数据的 REST API。

**核心组件：**
- **入口点**: `src/app.ts` - Express 应用设置，包含 CORS、路由和错误处理
- **API 服务**: `src/services/mihomoApiService.ts` - 处理对 Mihomo API 的外部 API 调用
- **控制器**: `src/controllers/playerController.ts` - 处理玩家端点的请求/响应
- **路由**: `src/routes/playerRoutes.ts` - 定义 `/api/player/:uid` 端点
- **HTTP 客户端**: `src/utils/apiClient.ts` - 为 Mihomo API 调用配置的 Axios 实例
- **类型定义**: `src/types/index.ts` - Player、Character 和 ApiResponse 的 TypeScript 接口

**请求流程：**
1. 客户端请求 `/api/player/:uid`
2. 路由处理器调用 `getPlayerInfo` 控制器
3. 控制器使用 `MihomoApiService` 获取数据
4. 服务通过 `apiClient` 向 `https://api.mihomo.me/sr_info/{uid}` 发起 HTTP 请求
5. 响应数据通过链式调用返回

**配置：**
- 使用 `dotenv` 处理环境变量
- 默认端口：3000（可通过 `PORT` 环境变量配置）
- 外部 API 基础 URL 可通过 `API_BASE_URL` 环境变量配置
- TypeScript 编译输出到 `dist/` 目录

**错误处理：**
- 全局错误处理中间件位于 `src/middleware/errorHandler.ts`
- 仅在开发模式下显示详细错误信息