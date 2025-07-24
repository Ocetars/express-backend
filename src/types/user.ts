// === 用户系统类型定义 ===

// 用户基础信息
export interface User {
  openid: string;
  unionid?: string;
  nickname?: string;
  avatar_url?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}

// 用户游戏账号
export interface UserGameAccount {
  id?: number;
  openid: string;
  uid: string;
  nickname?: string;
  level?: number;
  world_level?: number;
  is_primary?: boolean;
  is_active?: boolean;
  last_sync_time?: Date;
  created_at?: Date;
  updated_at?: Date;
}

// 用户角色数据
export interface UserCharacterData {
  id?: number;
  openid: string;
  uid: string;
  character_id: string;
  character_name: string;
  character_data: any; // 引用原有的 CharacterInfo，避免循环依赖
  rarity: number;
  level: number;
  rank: number;
  element?: string;
  path?: string;
  is_favorite?: boolean;
  sync_version?: number;
  created_at?: Date;
  updated_at?: Date;
}

// 用户设置
export interface UserSettings {
  openid: string;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  auto_sync?: boolean;
  notification_enabled?: boolean;
  data_cache_duration?: number;
  custom_settings?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

// 同步日志
export interface SyncLog {
  id?: number;
  openid: string;
  uid: string;
  sync_type: 'full' | 'incremental' | 'character';
  sync_status: 'success' | 'failed' | 'partial';
  characters_count?: number;
  error_message?: string;
  sync_duration?: number;
  created_at?: Date;
}

// API 请求相关
export interface WeChatHeaders {
  'x-wx-openid'?: string;
  'x-wx-appid'?: string;
  'x-wx-unionid'?: string;
}

// API 响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 用户登录响应
export interface LoginResponse {
  user: User;
  token?: string;
  isNewUser: boolean;
}

// 数据同步请求
export interface SyncRequest {
  uid: string;
  force_update?: boolean;
}

// 数据同步响应
export interface SyncResponse {
  success: boolean;
  characters_synced: number;
  characters_updated: number;
  characters_new: number;
  sync_time: Date;
  errors?: string[];
}