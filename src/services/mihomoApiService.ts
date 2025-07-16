import apiClient from '../utils/apiClient';
import { FormattedApiInfo } from '../types';

export class MihomoApiService {
  async getPlayerData(uid: string): Promise<FormattedApiInfo> {
    try {
      const apiUrl = `${process.env.API_BASE_URL}/${uid}`;
      console.log('正在请求API: ', apiUrl);
      
      const response = await apiClient.get<FormattedApiInfo>(`${uid}`);
      
      console.log('API请求成功，数据获取完成');
      return response.data;
    } catch (error: any) {
      console.error('=== API 请求失败详情 ===');
      console.error('UID:', uid);
      console.error('API_BASE_URL:', process.env.API_BASE_URL);
      console.error('完整URL:', `${process.env.API_BASE_URL}/${uid}`);
      
      if (error.response) {
        // 服务器响应了错误状态码
        console.error('响应状态码:', error.response.status);
        console.error('响应数据:', error.response.data);
        console.error('响应头:', error.response.headers);
        throw new Error(`API响应错误: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        // 请求发出了但没有收到响应
        console.error('请求超时或网络错误:', error.request);
        console.error('错误代码:', error.code);
        throw new Error(`网络请求失败: ${error.code || '未知错误'} - 无法连接到API服务器`);
      } else {
        // 其他错误
        console.error('请求配置错误:', error.message);
        throw new Error(`请求配置错误: ${error.message}`);
      }
    }
  }
}