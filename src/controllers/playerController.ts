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
    res.json(data);
  } catch (error: any) {
    console.error('PlayerController - getPlayerInfo 错误:', error.message);
    res.status(500).json({ 
      error: 'Failed to retrieve player data',
      details: error.message,
      uid: req.params.uid,
      timestamp: new Date().toISOString()
    });
  }
};

export const getPlayerInfoOnly = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }
    const data = await apiService.getPlayerData(uid);
    res.json(data.player);
  } catch (error: any) {
    console.error('PlayerController - getPlayerInfoOnly 错误:', error.message);
    res.status(500).json({ 
      error: 'Failed to retrieve player data',
      details: error.message,
      uid: req.params.uid,
      timestamp: new Date().toISOString()
    });
  }
};