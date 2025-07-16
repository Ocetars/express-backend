import apiClient from '../utils/apiClient';
import { FormattedApiInfo } from '../types';

export class MihomoApiService {
  async getPlayerData(uid: string): Promise<FormattedApiInfo> {
    try {
      console.log('正在请求API:', `${apiClient.defaults.baseURL}${uid}`);
      const response = await apiClient.get<FormattedApiInfo>(`${uid}`);
      console.log('API请求成功，状态码:', response.status);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch player data:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw new Error('Failed to fetch player data');
    }
  }
}