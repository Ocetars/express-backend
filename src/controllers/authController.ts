import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { getCurrentUserOpenid, getCurrentWxUser } from '../middleware/wxAuth';
import { ApiResponse, LoginResponse } from '../types/user';

const userService = new UserService();

/**
 * 用户登录接口
 * 基于微信云托管自动获取用户身份信息
 * GET /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const wxUser = getCurrentWxUser(req);
    
    if (!wxUser?.openid) {
      return res.status(401).json({
        success: false,
        error: '未获取到用户身份信息',
        code: 'NO_OPENID'
      } as ApiResponse);
    }

    // 自动登录或注册用户
    const { user, isNewUser } = await userService.loginOrRegister(
      wxUser.openid,
      wxUser.unionid
    );

    const response: LoginResponse = {
      user,
      isNewUser
    };

    res.json({
      success: true,
      data: response,
      message: isNewUser ? '欢迎新用户！' : '登录成功'
    } as ApiResponse<LoginResponse>);

  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({
      success: false,
      error: '登录过程中发生错误',
      code: 'LOGIN_ERROR'
    } as ApiResponse);
  }
};

/**
 * 获取当前用户信息
 * GET /api/auth/profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    const user = await userService.getUserByOpenid(openid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在 1',
        code: 'USER_NOT_FOUND'
      } as ApiResponse);
    }

    // 获取用户的游戏账号列表
    const gameAccounts = await userService.getUserGameAccounts(openid);
    
    // 获取用户设置
    const settings = await userService.getUserSettings(openid);

    res.json({
      success: true,
      data: {
        user,
        gameAccounts,
        settings
      },
      message: '获取用户信息成功'
    } as ApiResponse);

  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息时发生错误',
      code: 'GET_PROFILE_ERROR'
    } as ApiResponse);
  }
};

/**
 * 更新用户信息
 * PUT /api/auth/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    const { nickname, avatar_url } = req.body;
    
    // 验证输入
    if (nickname && (typeof nickname !== 'string' || nickname.length > 100)) {
      return res.status(400).json({
        success: false,
        error: '昵称格式不正确',
        code: 'INVALID_NICKNAME'
      } as ApiResponse);
    }

    if (avatar_url && (typeof avatar_url !== 'string' || avatar_url.length > 500)) {
      return res.status(400).json({
        success: false,
        error: '头像URL格式不正确',
        code: 'INVALID_AVATAR_URL'
      } as ApiResponse);
    }

    // 更新用户信息
    const updatedUser = await userService.updateUser(openid, {
      nickname,
      avatar_url
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: updatedUser,
      message: '用户信息更新成功'
    } as ApiResponse);

  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: '更新用户信息时发生错误',
      code: 'UPDATE_PROFILE_ERROR'
    } as ApiResponse);
  }
};

/**
 * 添加游戏账号
 * POST /api/auth/game-account
 */
export const addGameAccount = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    const { uid, nickname, level, world_level, is_primary } = req.body;

    // 验证UID
    if (!uid || typeof uid !== 'string' || !/^[0-9]{9}$/.test(uid)) {
      return res.status(400).json({
        success: false,
        error: 'UID格式不正确，应为9位数字',
        code: 'INVALID_UID'
      } as ApiResponse);
    }

    // 添加游戏账号
    const gameAccount = await userService.addGameAccount({
      openid,
      uid,
      nickname,
      level: level ? parseInt(level) : undefined,
      world_level: world_level ? parseInt(world_level) : undefined,
      is_primary: Boolean(is_primary),
      is_active: true
    });

    // 如果设为主账号，更新其他账号
    if (is_primary) {
      await userService.setPrimaryGameAccount(openid, uid);
    }

    res.json({
      success: true,
      data: gameAccount,
      message: '游戏账号添加成功'
    } as ApiResponse);

  } catch (error) {
    console.error('添加游戏账号失败:', error);
    res.status(500).json({
      success: false,
      error: '添加游戏账号时发生错误',
      code: 'ADD_GAME_ACCOUNT_ERROR'
    } as ApiResponse);
  }
};

/**
 * 设置主要游戏账号
 * PUT /api/auth/game-account/:uid/primary
 */
export const setPrimaryAccount = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    const { uid } = req.params;
    
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

    const success = await userService.setPrimaryGameAccount(openid, uid);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '游戏账号不存在',
        code: 'GAME_ACCOUNT_NOT_FOUND'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: '主要账号设置成功'
    } as ApiResponse);

  } catch (error) {
    console.error('设置主要账号失败:', error);
    res.status(500).json({
      success: false,
      error: '设置主要账号时发生错误',
      code: 'SET_PRIMARY_ACCOUNT_ERROR'
    } as ApiResponse);
  }
};

/**
 * 获取用户设置
 * GET /api/auth/settings
 */
export const getSettings = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    let settings = await userService.getUserSettings(openid);
    
    // 如果没有设置记录，创建默认设置
    if (!settings) {
      settings = await userService.createDefaultSettings(openid);
    }

    res.json({
      success: true,
      data: settings,
      message: '获取设置成功'
    } as ApiResponse);

  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取设置时发生错误',
      code: 'GET_SETTINGS_ERROR'
    } as ApiResponse);
  }
};

/**
 * 更新用户设置
 * PUT /api/auth/settings
 */
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const openid = getCurrentUserOpenid(req);
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        error: '用户未登录',
        code: 'NOT_LOGGED_IN'
      } as ApiResponse);
    }

    const allowedFields = [
      'theme', 'language', 'auto_sync', 
      'notification_enabled', 'data_cache_duration', 'custom_settings'
    ];
    
    const updates: any = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有有效的更新字段',
        code: 'NO_VALID_FIELDS'
      } as ApiResponse);
    }

    const updatedSettings = await userService.updateUserSettings(openid, updates);

    res.json({
      success: true,
      data: updatedSettings,
      message: '设置更新成功'
    } as ApiResponse);

  } catch (error) {
    console.error('更新设置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新设置时发生错误',
      code: 'UPDATE_SETTINGS_ERROR'
    } as ApiResponse);
  }
};