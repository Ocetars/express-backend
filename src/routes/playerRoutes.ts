import express from 'express';
import { getPlayerInfo } from '../controllers/playerController';

const router = express.Router();

router.get('/:uid', getPlayerInfo);

export default router;