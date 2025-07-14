import express from 'express';
import { getPlayerInfo, getPlayerInfoOnly } from '../controllers/playerController';
import { validateUID } from '../middleware/validation';

const router = express.Router();

router.get('/:uid', validateUID, getPlayerInfo);
router.get('/:uid/info', validateUID, getPlayerInfoOnly);

export default router;