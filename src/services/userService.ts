import { 
  executeQuery, 
  executeQuerySingle, 
  executeInsert, 
  executeTransaction 
} from '../config/database';
import { 
  User, 
  UserGameAccount, 
  UserCharacterData, 
  UserSettings,
  SyncLog 
} from '../types/user';

export class UserService {
  
  // === 用户基础操作 ===
  
  /**
   * 根据openid获取用户信息
   */
  async getUserByOpenid(openid: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE openid = ?';
    return await executeQuerySingle<User>(query, [openid]);
  }

  /**
   * 创建新用户
   */
  async createUser(userData: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
    const query = `
      INSERT INTO users (openid, unionid, nickname, avatar_url, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      userData.openid,
      userData.unionid || null,
      userData.nickname || null,
      userData.avatar_url || null,
      userData.is_active !== false
    ];

    await executeInsert(query, params);
    return await this.getUserByOpenid(userData.openid) as User;
  }

  /**
   * 更新用户信息
   */
  async updateUser(openid: string, updates: Partial<User>): Promise<User | null> {
    const fields = [];
    const params = [];

    if (updates.unionid !== undefined) {
      fields.push('unionid = ?');
      params.push(updates.unionid);
    }
    if (updates.nickname !== undefined) {
      fields.push('nickname = ?');
      params.push(updates.nickname);
    }
    if (updates.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      params.push(updates.avatar_url);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(updates.is_active);
    }

    if (fields.length === 0) {
      return await this.getUserByOpenid(openid);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(openid);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE openid = ?`;
    await executeQuery(query, params);
    
    return await this.getUserByOpenid(openid);
  }

  /**
   * 用户登录或注册（自动创建用户）
   */
  async loginOrRegister(openid: string, unionid?: string, nickname?: string): Promise<{ user: User; isNewUser: boolean }> {
    let user = await this.getUserByOpenid(openid);
    let isNewUser = false;

    if (!user) {
      user = await this.createUser({
        openid,
        unionid,
        nickname,
        is_active: true
      });
      isNewUser = true;

      // 为新用户创建默认设置
      await this.createDefaultSettings(openid);
    } else {
      // 更新现有用户的unionid和nickname（如果有新的）
      const updates: Partial<User> = {};
      if (unionid && unionid !== user.unionid) {
        updates.unionid = unionid;
      }
      if (nickname && nickname !== user.nickname) {
        updates.nickname = nickname;
      }
      
      if (Object.keys(updates).length > 0) {
        user = await this.updateUser(openid, updates) as User;
      }
    }

    return { user, isNewUser };
  }

  // === 游戏账号操作 ===

  /**
   * 获取用户的游戏账号列表
   */
  async getUserGameAccounts(openid: string): Promise<UserGameAccount[]> {
    const query = 'SELECT * FROM user_game_accounts WHERE openid = ? AND is_active = 1 ORDER BY is_primary DESC, created_at DESC';
    return await executeQuery<UserGameAccount>(query, [openid]);
  }

  /**
   * 添加游戏账号
   */
  async addGameAccount(accountData: Omit<UserGameAccount, 'id' | 'created_at' | 'updated_at'>): Promise<UserGameAccount> {
    const query = `
      INSERT INTO user_game_accounts (openid, uid, nickname, level, world_level, is_primary, is_active, last_sync_time) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nickname = VALUES(nickname),
        level = VALUES(level),
        world_level = VALUES(world_level),
        is_active = VALUES(is_active),
        last_sync_time = VALUES(last_sync_time),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    const params = [
      accountData.openid,
      accountData.uid,
      accountData.nickname || null,
      accountData.level || null,
      accountData.world_level || null,
      accountData.is_primary || false,
      accountData.is_active !== false,
      accountData.last_sync_time || null
    ];

    await executeInsert(query, params);
    const result = await executeQuerySingle<UserGameAccount>(
      'SELECT * FROM user_game_accounts WHERE openid = ? AND uid = ?',
      [accountData.openid, accountData.uid]
    );
    return result as UserGameAccount;
  }

  /**
   * 设置主要游戏账号
   */
  async setPrimaryGameAccount(openid: string, uid: string): Promise<boolean> {
    return await executeTransaction(async (connection) => {
      // 先将所有账号设为非主要
      await connection.execute(
        'UPDATE user_game_accounts SET is_primary = 0 WHERE openid = ?',
        [openid]
      );
      
      // 设置指定账号为主要
      const [result] = await connection.execute(
        'UPDATE user_game_accounts SET is_primary = 1 WHERE openid = ? AND uid = ?',
        [openid, uid]
      );
      
      return (result as any).affectedRows > 0;
    });
  }

  // === 角色数据操作 ===

  /**
   * 获取用户角色数据
   */
  async getUserCharacterData(openid: string, uid?: string): Promise<UserCharacterData[]> {
    let query = 'SELECT * FROM user_character_data WHERE openid = ?';
    const params = [openid];
    
    if (uid) {
      query += ' AND uid = ?';
      params.push(uid);
    }
    
    query += ' ORDER BY updated_at DESC';
    return await executeQuery<UserCharacterData>(query, params);
  }

  /**
   * 保存角色数据
   */
  async saveCharacterData(characterData: Omit<UserCharacterData, 'id' | 'created_at' | 'updated_at'>): Promise<UserCharacterData> {
    const query = `
      INSERT INTO user_character_data 
      (openid, uid, character_id, character_name, character_data, rarity, level, \`rank\`, element, path, sync_version) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        character_name = VALUES(character_name),
        character_data = VALUES(character_data),
        rarity = VALUES(rarity),
        level = VALUES(level),
        \`rank\` = VALUES(\`rank\`),
        element = VALUES(element),
        path = VALUES(path),
        sync_version = sync_version + 1,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    const params = [
      characterData.openid,
      characterData.uid,
      characterData.character_id,
      characterData.character_name,
      JSON.stringify(characterData.character_data),
      characterData.rarity,
      characterData.level,
      characterData.rank,
      characterData.element || null,
      characterData.path || null,
      characterData.sync_version || 1
    ];

    await executeInsert(query, params);
    
    const result = await executeQuerySingle<UserCharacterData>(
      'SELECT * FROM user_character_data WHERE openid = ? AND uid = ? AND character_id = ?',
      [characterData.openid, characterData.uid, characterData.character_id]
    );
    return result as UserCharacterData;
  }

  /**
   * 批量保存角色数据
   */
  async batchSaveCharacterData(openid: string, uid: string, charactersData: any[]): Promise<{ saved: number; updated: number }> {
    let saved = 0;
    let updated = 0;

    for (const character of charactersData) {
      const characterData: Omit<UserCharacterData, 'id' | 'created_at' | 'updated_at'> = {
        openid,
        uid,
        character_id: character.id,
        character_name: character.name,
        character_data: character,
        rarity: character.rarity,
        level: character.level,
        rank: character.rank,
        element: character.element?.name,
        path: character.path?.name,
        sync_version: 1
      };

      const existing = await executeQuerySingle(
        'SELECT id FROM user_character_data WHERE openid = ? AND uid = ? AND character_id = ?',
        [openid, uid, character.id]
      );

      await this.saveCharacterData(characterData);
      
      if (existing) {
        updated++;
      } else {
        saved++;
      }
    }

    return { saved, updated };
  }

  // === 用户设置操作 ===

  /**
   * 获取用户设置
   */
  async getUserSettings(openid: string): Promise<UserSettings | null> {
    const query = 'SELECT * FROM user_settings WHERE openid = ?';
    return await executeQuerySingle<UserSettings>(query, [openid]);
  }

  /**
   * 创建默认设置
   */
  async createDefaultSettings(openid: string): Promise<UserSettings> {
    const query = `
      INSERT INTO user_settings (openid, theme, language, auto_sync, notification_enabled, data_cache_duration)
      VALUES (?, 'auto', 'zh-CN', 1, 1, 3600)
      ON DUPLICATE KEY UPDATE openid = openid
    `;
    
    await executeInsert(query, [openid]);
    return await this.getUserSettings(openid) as UserSettings;
  }

  /**
   * 更新用户设置
   */
  async updateUserSettings(openid: string, settings: Partial<UserSettings>): Promise<UserSettings | null> {
    const fields = [];
    const params = [];

    Object.entries(settings).forEach(([key, value]) => {
      if (key !== 'openid' && key !== 'created_at' && key !== 'updated_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'custom_settings' && typeof value === 'object') {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
      }
    });

    if (fields.length === 0) {
      return await this.getUserSettings(openid);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(openid);

    const query = `UPDATE user_settings SET ${fields.join(', ')} WHERE openid = ?`;
    await executeQuery(query, params);
    
    return await this.getUserSettings(openid);
  }

  // === 同步日志操作 ===

  /**
   * 创建同步日志
   */
  async createSyncLog(logData: Omit<SyncLog, 'id' | 'created_at'>): Promise<SyncLog> {
    const query = `
      INSERT INTO sync_logs (openid, uid, sync_type, sync_status, characters_count, error_message, sync_duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      logData.openid,
      logData.uid,
      logData.sync_type,
      logData.sync_status,
      logData.characters_count || 0,
      logData.error_message || null,
      logData.sync_duration || null
    ];

    const insertId = await executeInsert(query, params);
    const result = await executeQuerySingle<SyncLog>(
      'SELECT * FROM sync_logs WHERE id = ?',
      [insertId]
    );
    return result as SyncLog;
  }

  /**
   * 获取用户同步历史
   */
  async getUserSyncLogs(openid: string, limit: number = 20): Promise<SyncLog[]> {
    const query = 'SELECT * FROM sync_logs WHERE openid = ? ORDER BY created_at DESC LIMIT ?';
    return await executeQuery<SyncLog>(query, [openid, limit]);
  }
}