import express from 'express';
import { 
  getCharacters, 
  syncCharacters, 
  getSyncLogs,
  toggleCharacterFavorite,
  deleteCharacter,
  getUserStats
} from '../controllers/userDataController';
import { wxAuthRequired, mockWxAuth } from '../middleware/wxAuth';

const router = express.Router();

// 开发环境下启用模拟认证
if (process.env.NODE_ENV === 'development') {
  router.use(mockWxAuth);
}

// 角色数据管理
router.get('/characters', wxAuthRequired, getCharacters);
router.post('/sync', wxAuthRequired, syncCharacters);
router.get('/sync-logs', wxAuthRequired, getSyncLogs);

// 角色操作
router.put('/characters/:uid/:characterId/favorite', wxAuthRequired, toggleCharacterFavorite);
router.delete('/characters/:uid/:characterId', wxAuthRequired, deleteCharacter);

// 用户统计
router.get('/stats', wxAuthRequired, getUserStats);

export default router;