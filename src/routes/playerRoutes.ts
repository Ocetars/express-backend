import express from 'express';
import { getPlayerInfo } from '../controllers/playerController';
import { validateUID } from '../middleware/validation';

const router = express.Router();

router.get('/:uid', validateUID, getPlayerInfo);

export default router;