-- SR-Quick 用户系统数据库表结构设计
-- 基于微信云托管 MySQL 8.0

-- 删除已存在的表（按依赖关系逆序删除）
DROP TABLE IF EXISTS sync_logs;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS user_character_data;
DROP TABLE IF EXISTS user_game_accounts;
DROP TABLE IF EXISTS users;

-- 用户表
CREATE TABLE users (
    openid VARCHAR(50) PRIMARY KEY COMMENT '微信openid，作为用户唯一标识',
    unionid VARCHAR(50) NULL COMMENT '微信unionid，跨应用用户标识',
    nickname VARCHAR(100) NULL COMMENT '用户昵称',
    avatar_url VARCHAR(500) NULL COMMENT '头像URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_active TINYINT(1) DEFAULT 1 COMMENT '用户状态：1-活跃，0-禁用',
    
    INDEX idx_unionid (unionid),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户基础信息表';

-- 用户星铁UID绑定表
CREATE TABLE user_game_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openid VARCHAR(50) NOT NULL COMMENT '用户openid',
    uid VARCHAR(20) NOT NULL COMMENT '星铁UID', 
    nickname VARCHAR(100) NULL COMMENT '游戏内昵称',
    level INT NULL COMMENT '开拓等级',
    world_level INT NULL COMMENT '均衡等级',
    is_primary TINYINT(1) DEFAULT 0 COMMENT '是否主要账号',
    is_active TINYINT(1) DEFAULT 1 COMMENT '账号状态',
    last_sync_time TIMESTAMP NULL COMMENT '最后同步时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_openid_uid (openid, uid),
    FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
    INDEX idx_uid (uid),
    INDEX idx_last_sync_time (last_sync_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户游戏账号绑定表';

-- 用户角色面板数据表
CREATE TABLE user_character_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openid VARCHAR(50) NOT NULL COMMENT '用户openid',
    uid VARCHAR(20) NOT NULL COMMENT '星铁UID',
    character_id VARCHAR(20) NOT NULL COMMENT '角色ID',
    character_name VARCHAR(50) NOT NULL COMMENT '角色名称',
    character_data JSON NOT NULL COMMENT '角色完整数据（JSON格式）',
    rarity INT NOT NULL DEFAULT 0 COMMENT '稀有度',
    level INT NOT NULL DEFAULT 1 COMMENT '角色等级',
    `rank` INT NOT NULL DEFAULT 0 COMMENT '星魂等级',
    element VARCHAR(20) NULL COMMENT '属性',
    path VARCHAR(20) NULL COMMENT '命途',
    is_favorite TINYINT(1) DEFAULT 0 COMMENT '是否收藏',
    sync_version INT DEFAULT 1 COMMENT '同步版本号',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_openid_uid_character (openid, uid, character_id),
    FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
    INDEX idx_uid_character (uid, character_id),
    INDEX idx_character_name (character_name),
    INDEX idx_rarity_level (rarity, level),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色面板数据表';

-- 用户设置表
CREATE TABLE user_settings (
    openid VARCHAR(50) PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'auto' COMMENT '主题设置：light/dark/auto',
    language VARCHAR(10) DEFAULT 'zh-CN' COMMENT '语言设置',
    auto_sync TINYINT(1) DEFAULT 1 COMMENT '自动同步开关',
    notification_enabled TINYINT(1) DEFAULT 1 COMMENT '通知开关',
    data_cache_duration INT DEFAULT 3600 COMMENT '数据缓存时长（秒）',
    custom_settings JSON NULL COMMENT '其他自定义设置',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户设置表';

-- 数据同步日志表
CREATE TABLE sync_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openid VARCHAR(50) NOT NULL COMMENT '用户openid',
    uid VARCHAR(20) NOT NULL COMMENT '星铁UID',
    sync_type ENUM('full', 'incremental', 'character') NOT NULL COMMENT '同步类型',
    sync_status ENUM('success', 'failed', 'partial') NOT NULL COMMENT '同步状态',
    characters_count INT DEFAULT 0 COMMENT '同步角色数量',
    error_message TEXT NULL COMMENT '错误信息',
    sync_duration INT NULL COMMENT '同步耗时（毫秒）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
    INDEX idx_openid_created (openid, created_at),
    INDEX idx_uid_created (uid, created_at),
    INDEX idx_sync_status (sync_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据同步日志表';

-- 初始化默认数据
INSERT INTO users (openid, nickname) VALUES 
('demo_openid', 'Demo User') 
ON DUPLICATE KEY UPDATE nickname='Demo User';