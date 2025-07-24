# SR-Quick 后端用户系统部署指南

## 概述

本项目为 SR-Quick 星穹铁道角色面板速查应用提供完整的用户系统后端服务，包括：
- 基于微信云托管的用户认证
- 角色面板数据云端存储和同步
- 多账号管理
- 个性化设置

## 快速开始

### 1. 环境准备

**开发环境**：
- Node.js 18+
- MySQL 5.7+ 或 微信云托管 MySQL
- 微信小程序开发者账号

**生产环境**：
- 微信云托管服务
- 微信云托管 MySQL 数据库

### 2. 本地开发设置

```bash
# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，配置数据库连接等参数
# 注意：本地开发时可以使用模拟认证功能

# 初始化数据库
# 在你的 MySQL 数据库中执行 database-schema.sql

# 启动开发服务器
npm run dev
```

### 3. 微信云托管部署

#### 步骤 1：开通云托管服务
1. 在微信公众平台开通云托管服务
2. 创建新的云托管服务
3. 配置服务基本信息

#### 步骤 2：开通 MySQL 数据库
1. 在云托管控制台开通 MySQL 数据库
2. 选择 MySQL 5.7 版本（推荐）
3. 设置数据库密码
4. 记录数据库连接信息

#### 步骤 3：初始化数据库
1. 在云托管控制台的数据库管理页面
2. 导入 `database-schema.sql` 文件
3. 或者使用数据库客户端连接并执行SQL脚本

#### 步骤 4：配置环境变量
在云托管控制台设置以下环境变量：
```
NODE_ENV=production
DB_HOST=your-cloud-mysql-host
DB_PORT=3306
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=sr_quick
API_BASE_URL=https://api.mihomo.me/sr_info/
FRONTEND_URL=https://your-frontend-domain.com
```

#### 步骤 5：部署应用
```bash
# 构建生产版本
npm run build

# 使用 Docker 部署
npm run docker:build
npm run docker:run

# 或直接部署到微信云托管
# 按照微信云托管文档进行代码上传和部署
```

## API 接口文档

### 认证相关 `/api/auth`

#### 用户登录
```http
GET /api/auth/login
```
自动根据微信云托管请求头进行用户识别和登录。

响应：
```json
{
  "success": true,
  "data": {
    "user": {
      "openid": "user_openid",
      "nickname": "用户昵称",
      "avatar_url": "头像URL",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "isNewUser": false
  },
  "message": "登录成功"
}
```

#### 获取用户信息
```http
GET /api/auth/profile
```

#### 更新用户信息
```http
PUT /api/auth/profile
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatar_url": "新头像URL"
}
```

#### 添加游戏账号
```http
POST /api/auth/game-account
Content-Type: application/json

{
  "uid": "123456789",
  "nickname": "游戏昵称",
  "level": 70,
  "world_level": 8,
  "is_primary": true
}
```

### 数据管理 `/api/user`

#### 获取角色数据
```http
GET /api/user/characters
GET /api/user/characters?uid=123456789
```

#### 同步角色数据
```http
POST /api/user/sync
Content-Type: application/json

{
  "uid": "123456789",
  "force_update": false
}
```

响应：
```json
{
  "success": true,
  "data": {
    "characters_synced": 8,
    "characters_updated": 3,
    "characters_new": 5,
    "sync_time": "2024-01-01T12:00:00Z"
  },
  "message": "同步完成！新增 5 个角色，更新 3 个角色"
}
```

#### 获取同步历史
```http
GET /api/user/sync-logs?limit=20
```

#### 切换角色收藏状态
```http
PUT /api/user/characters/:uid/:characterId/favorite
Content-Type: application/json

{
  "is_favorite": true
}
```

## 前端集成示例

### Taro 小程序集成

```javascript
// 用户登录
const login = async () => {
  try {
    const res = await Taro.request({
      url: 'https://your-backend-domain.com/api/auth/login',
      method: 'GET'
    });
    
    if (res.data.success) {
      console.log('登录成功:', res.data.data.user);
      // 保存用户信息到本地存储
      Taro.setStorageSync('userInfo', res.data.data.user);
    }
  } catch (error) {
    console.error('登录失败:', error);
  }
};

// 同步角色数据
const syncCharacters = async (uid) => {
  try {
    Taro.showLoading({ title: '同步中...' });
    
    const res = await Taro.request({
      url: 'https://your-backend-domain.com/api/user/sync',
      method: 'POST',
      data: { uid }
    });
    
    if (res.data.success) {
      Taro.showToast({
        title: '同步成功',
        icon: 'success'
      });
      // 刷新角色列表
      await getCharacters();
    }
  } catch (error) {
    Taro.showToast({
      title: '同步失败',
      icon: 'error'
    });
  } finally {
    Taro.hideLoading();
  }
};

// 获取角色数据
const getCharacters = async (uid) => {
  try {
    const res = await Taro.request({
      url: `https://your-backend-domain.com/api/user/characters${uid ? `?uid=${uid}` : ''}`,
      method: 'GET'
    });
    
    if (res.data.success) {
      return res.data.data;
    }
  } catch (error) {
    console.error('获取角色数据失败:', error);
  }
};
```

## 数据库说明

### 主要数据表

1. **users** - 用户基础信息表
2. **user_game_accounts** - 用户游戏账号绑定表
3. **user_character_data** - 用户角色面板数据表
4. **user_settings** - 用户设置表
5. **sync_logs** - 数据同步日志表

### 数据关系

- 一个用户可以绑定多个星铁UID
- 每个UID可以有多个角色数据
- 支持角色数据版本控制和同步状态追踪

## 常见问题

### Q: 本地开发时如何测试微信认证？
A: 项目支持开发环境模拟认证，可以通过请求头 `x-mock-openid` 设置模拟用户ID。

### Q: 数据库连接失败怎么办？
A: 检查环境变量配置，确保数据库服务正常运行。微信云托管MySQL有冷启动特性，项目已内置重试逻辑。

### Q: 如何处理大量用户的并发同步？
A: 项目已配置连接池和限流中间件，生产环境建议监控API响应时间和数据库连接数。

### Q: 角色数据同步失败的常见原因？
A: 通常是UID不存在、展示柜未开放或网络问题。可以查看 sync_logs 表了解详细错误信息。

## 监控和维护

### 日志监控
- 应用日志：检查同步错误、数据库连接问题
- 数据库日志：监控慢查询、连接数
- API响应时间：关注用户体验

### 数据维护
- 定期清理过期的同步日志
- 监控数据库存储空间使用情况
- 备份重要的用户数据

### 性能优化
- 适当设置数据缓存
- 优化数据库查询索引
- 考虑CDN加速API响应

## 技术支持

如有问题，请提供以下信息：
1. 错误日志和堆栈信息
2. 请求的API端点和参数
3. 数据库配置（隐藏敏感信息）
4. 微信云托管环境信息