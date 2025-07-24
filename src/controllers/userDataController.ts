import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { MihomoApiService } from '../services/mihomoApiService';
import { getCurrentUserOpenid } from '../middleware/wxAuth';
import { executeQuery, executeQuerySingle } from '../config/database';
import { ApiResponse, SyncRequest, SyncResponse } from '../types/user';

const userService = new UserService();
const mihomoApiService = new MihomoApiService();

/**
 * 获取用户角色数据
 * GET /api/user/characters
 * GET /api/user/characters?uid=123456789
 */
export const getCharacters = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    const { uid } = req.query;
    
    // 验证UID格式（如果提供）
    if (uid && (typeof uid !== 'string' || !/^[0-9]{9}$/.test(uid))) {
      return res.status(400).json({
        success: false,
        error: 'UID格式不正确',
        code: 'INVALID_UID'
      } as ApiResponse);
    }

    const characters = await userService.getUserCharacterData(
      openid, 
      uid as string | undefined
    );

    // 解析 character_data JSON 字段
    const formattedCharacters = characters.map(char => ({
      ...char,
      character_data: typeof char.character_data === 'string' 
        ? JSON.parse(char.character_data)
        : char.character_data
    }));

    res.json({
      success: true,
      data: formattedCharacters,
      message: `获取到 ${formattedCharacters.length} 个角色数据`
    } as ApiResponse);

  } catch (error) {
    console.error('获取角色数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取角色数据时发生错误',
      code: 'GET_CHARACTERS_ERROR'
    } as ApiResponse);
  }
};

/**
 * 同步角色数据
 * POST /api/user/sync
 * Body: { uid: "123456789", force_update?: boolean }
 */
export const syncCharacters = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const openid = getCurrentUserOpenid(req);
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    const { uid, force_update = false } = req.body as SyncRequest;

    // 验证UID
    if (!uid || typeof uid !== 'string' || !/^[0-9]{9}$/.test(uid)) {
      return res.status(400).json({
        success: false,
        error: 'UID格式不正确，应为9位数字',
        code: 'INVALID_UID'
      } as ApiResponse);
    }

    // 检查用户是否已绑定该UID
    const gameAccounts = await userService.getUserGameAccounts(openid);
    const targetAccount = gameAccounts.find(account => account.uid === uid);
    
    if (!targetAccount) {
      // 如果没有绑定，先尝试获取玩家信息来验证UID
      try {
        const playerData = await mihomoApiService.getPlayerData(uid);
        
        // 自动添加游戏账号
        await userService.addGameAccount({
          openid,
          uid,
          nickname: playerData.player.nickname,
          level: playerData.player.level,
          world_level: playerData.player.world_level,
          is_primary: gameAccounts.length === 0, // 如果是第一个账号，设为主账号
          is_active: true
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'UID不存在或无法访问，请检查UID是否正确且已开放展示柜',
          code: 'INVALID_GAME_UID'
        } as ApiResponse);
      }
    }

    // 从Mihomo API获取最新数据
    let playerData;
    try {
      playerData = await mihomoApiService.getPlayerData(uid);
    } catch (error) {
      console.error(`获取UID ${uid} 的数据失败:`, error);
      
      // 记录同步失败日志
      await userService.createSyncLog({
        openid,
        uid,
        sync_type: 'full',
        sync_status: 'failed',
        error_message: '无法从游戏API获取数据',
        sync_duration: Date.now() - startTime
      });

      return res.status(502).json({
        success: false,
        error: '无法从游戏服务器获取数据，请稍后重试',
        code: 'API_ERROR'
      } as ApiResponse);
    }

    // 更新游戏账号基础信息
    await userService.addGameAccount({
      openid,
      uid,
      nickname: playerData.player.nickname,
      level: playerData.player.level,
      world_level: playerData.player.world_level,
      is_primary: targetAccount?.is_primary || false,
      is_active: true,
      last_sync_time: new Date()
    });

    // 批量保存角色数据
    const { saved, updated } = await userService.batchSaveCharacterData(
      openid,
      uid,
      playerData.characters
    );

    const syncDuration = Date.now() - startTime;

    // 记录成功同步日志
    await userService.createSyncLog({
      openid,
      uid,
      sync_type: 'full',
      sync_status: 'success',
      characters_count: playerData.characters.length,
      sync_duration: syncDuration
    });

    const response: SyncResponse = {
      success: true,
      characters_synced: playerData.characters.length,
      characters_updated: updated,
      characters_new: saved,
      sync_time: new Date(),
      errors: []
    };

    res.json({
      success: true,
      data: response,
      message: `同步完成！新增 ${saved} 个角色，更新 ${updated} 个角色`
    } as ApiResponse<SyncResponse>);

  } catch (error) {
    const syncDuration = Date.now() - startTime;
    console.error('角色数据同步失败:', error);

    // 记录同步失败日志
    const openid = getCurrentUserOpenid(req);
    const { uid } = req.body;
    
    if (openid && uid) {
      await userService.createSyncLog({
        openid,
        uid,
        sync_type: 'full',
        sync_status: 'failed',
        error_message: error instanceof Error ? error.message : '未知错误',
        sync_duration: syncDuration
      });
    }

    res.status(500).json({
      success: false,
      error: '同步过程中发生错误',
      code: 'SYNC_ERROR'
    } as ApiResponse);
  }
};

/**
 * 获取同步历史
 * GET /api/user/sync-logs
 */
export const getSyncLogs = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const syncLogs = await userService.getUserSyncLogs(openid, Math.min(limit, 100));

    res.json({
      success: true,
      data: syncLogs,
      message: '获取同步历史成功'
    } as ApiResponse);

  } catch (error) {
    console.error('获取同步历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取同步历史时发生错误',
      code: 'GET_SYNC_LOGS_ERROR'
    } as ApiResponse);
  }
};

/**
 * 更新角色收藏状态
 * PUT /api/user/characters/:uid/:characterId/favorite
 */
export const toggleCharacterFavorite = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    const { uid, characterId } = req.params;
    const { is_favorite } = req.body;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    if (!uid || !/^[0-9]{9}$/.test(uid)) {
      return res.status(400).json({
        success: false,
        error: 'UID格式不正确',
        code: 'INVALID_UID'
      } as ApiResponse);
    }

    // 更新收藏状态
    const query = `
      UPDATE user_character_data 
      SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP
      WHERE openid = ? AND uid = ? AND character_id = ?
    `;
    
    await executeQuery(query, [Boolean(is_favorite), openid, uid, characterId]);

    res.json({
      success: true,
      message: is_favorite ? '已添加到收藏' : '已取消收藏'
    } as ApiResponse);

  } catch (error) {
    console.error('更新角色收藏状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新收藏状态时发生错误',
      code: 'UPDATE_FAVORITE_ERROR'
    } as ApiResponse);
  }
};

/**
 * 删除角色数据
 * DELETE /api/user/characters/:uid/:characterId
 */
export const deleteCharacter = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    const { uid, characterId } = req.params;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    if (!uid || !/^[0-9]{9}$/.test(uid)) {
      return res.status(400).json({
        success: false,
        error: 'UID格式不正确',
        code: 'INVALID_UID'
      } as ApiResponse);
    }

    const query = 'DELETE FROM user_character_data WHERE openid = ? AND uid = ? AND character_id = ?';
    await executeQuery(query, [openid, uid, characterId]);

    res.json({
      success: true,
      message: '角色数据删除成功'
    } as ApiResponse);

  } catch (error) {
    console.error('删除角色数据失败:', error);
    res.status(500).json({
      success: false,
      error: '删除角色数据时发生错误',
      code: 'DELETE_CHARACTER_ERROR'
    } as ApiResponse);
  }
};

/**
 * 获取用户统计信息
 * GET /api/user/stats
 */
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    // 获取统计数据
    const [
      gameAccountsCount,
      charactersCount,
      lastSyncLog,
      favoriteCharacters
    ] = await Promise.all([
      executeQuerySingle('SELECT COUNT(*) as count FROM user_game_accounts WHERE openid = ? AND is_active = 1', [openid]),
      executeQuerySingle('SELECT COUNT(*) as count FROM user_character_data WHERE openid = ?', [openid]),
      executeQuerySingle('SELECT * FROM sync_logs WHERE openid = ? ORDER BY created_at DESC LIMIT 1', [openid]),
      executeQuerySingle('SELECT COUNT(*) as count FROM user_character_data WHERE openid = ? AND is_favorite = 1', [openid])
    ]);

    const stats = {
      game_accounts_count: gameAccountsCount?.count || 0,
      characters_count: charactersCount?.count || 0,
      favorite_characters_count: favoriteCharacters?.count || 0,
      last_sync_time: lastSyncLog?.created_at || null,
      last_sync_status: lastSyncLog?.sync_status || null
    };

    res.json({
      success: true,
      data: stats,
      message: '获取统计信息成功'
    } as ApiResponse);

  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息时发生错误',
      code: 'GET_STATS_ERROR'
    } as ApiResponse);
  }
};