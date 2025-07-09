import { Request, Response } from 'express';
import { MihomoApiService } from '../services/mihomoApiService';

const apiService = new MihomoApiService();

export const getPlayerInfo = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }
    const data = await apiService.getPlayerData(uid);
    console.log(data.player.nickname);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve player data' });
  }
};