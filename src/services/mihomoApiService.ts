import apiClient from '../utils/apiClient';
import { FormattedApiInfo } from '../types';

export class MihomoApiService {
  async getPlayerData(uid: string): Promise<FormattedApiInfo> {
    try {
      const response = await apiClient.get<FormattedApiInfo>(`${uid}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch player data:', error);
      throw new Error('Failed to fetch player data');
    }
  }
}