# API 接口文档

## 基础信息

- **基础 URL**: `http://localhost:3000` (开发环境)
- **Content-Type**: `application/json`
- **CORS**: 支持跨域请求

## 接口列表

### 1. 健康检查

**端点**: `GET /health`

**描述**: 检查服务器状态

**响应示例**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

### 2. 获取玩家信息

**端点**: `GET /api/player/:uid`

**描述**: 根据 UID 获取星穹铁道玩家详细信息

**参数**:
- `uid` (路径参数): 9-10位数字的玩家 UID

**验证规则**:
- UID 必须为纯数字
- UID 长度必须为 9-10 位

**成功响应示例** (200):
```json
{
  "player": {
    "uid": "123456789",
    "nickname": "玩家昵称",
    "level": 65,
    "world_level": 6,
    "friend_count": 42,
    "signature": "个人签名",
    "is_display": true,
    "avatar": {
      "id": "8004",
      "name": "三月七",
      "icon": "avatar_icon_url"
    },
    "space_info": {
      "universe_level": 6,
      "avatar_count": 25,
      "light_cone_count": 18,
      "relic_count": 156,
      "achievement_count": 145
    }
  },
  "characters": [
    {
      "id": "1001",
      "name": "三月七",
      "rarity": 4,
      "rank": 3,
      "level": 80,
      "promotion": 6,
      "icon": "character_icon_url",
      "path": {
        "id": "Preservation",
        "name": "存护",
        "icon": "path_icon_url"
      },
      "element": {
        "id": "Ice",
        "name": "冰",
        "color": "#1E90FF",
        "icon": "element_icon_url"
      },
      "skills": [...],
      "light_cone": {...},
      "relics": [...],
      "attributes": [...],
      "properties": [...]
    }
  ]
}
```

**错误响应示例**:

**400 - 参数验证失败**:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "value": "invalid_uid",
      "msg": "UID must be numeric",
      "path": "uid",
      "location": "params"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**429 - 请求频率限制**:
```json
{
  "error": "Too many requests, please try again later."
}
```

**500 - 服务器错误**:
```json
{
  "error": "Internal Server Error",
  "status": 500,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/player/123456789"
}
```

## 安全性

- **频率限制**: 每15分钟最多100次请求
- **安全头**: 使用 Helmet 中间件设置安全头
- **输入验证**: 所有参数都经过严格验证
- **错误处理**: 生产环境不暴露敏感错误信息

## 前端集成示例

### JavaScript/TypeScript

```typescript
const API_BASE_URL = 'http://localhost:3000';

// 获取玩家信息
async function getPlayerInfo(uid: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/player/${uid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取玩家信息失败:', error);
    throw error;
  }
}

// 检查服务器状态
async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('健康检查失败:', error);
    throw error;
  }
}
```

### React Hook 示例

```typescript
import { useState, useEffect } from 'react';

interface PlayerData {
  player: any;
  characters: any[];
}

function usePlayerData(uid: string) {
  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:3000/api/player/${uid}`);
        if (!response.ok) {
          throw new Error('获取数据失败');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [uid]);

  return { data, loading, error };
}
```

## 部署说明

### 环境变量配置

复制 `.env.example` 为 `.env` 并配置相应值：

```bash
cp .env.example .env
```

### 开发环境

```bash
npm install
npm run dev
```

### 生产环境

```bash
npm install
npm run build
npm start
```