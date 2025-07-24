import express from 'express';
import { 
  login, 
  getProfile, 
  updateProfile, 
  addGameAccount, 
  setPrimaryAccount,
  getSettings,
  updateSettings 
} from '../controllers/authController';
import { wxAuthRequired, wxAuthOptional, mockWxAuth } from '../middleware/wxAuth';

const router = express.Router();

// 开发环境下启用模拟认证
if (process.env.NODE_ENV === 'development') {
  router.use(mockWxAuth);
}

// 用户登录（自动登录，基于微信云托管）
router.get('/login', wxAuthRequired, login);

// 用户信息相关
router.get('/profile', wxAuthRequired, getProfile);
router.put('/profile', wxAuthRequired, updateProfile);

// 游戏账号管理
router.post('/game-account', wxAuthRequired, addGameAccount);
router.put('/game-account/:uid/primary', wxAuthRequired, setPrimaryAccount);

// 用户设置
router.get('/settings', wxAuthRequired, getSettings);
router.put('/settings', wxAuthRequired, updateSettings);

export default router;