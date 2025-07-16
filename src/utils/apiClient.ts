import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// 确保 baseURL 末尾有正确的分隔符
const baseURL = process.env.API_BASE_URL || 'http://api.mihomo.me/sr_info_parsed';
const normalizedBaseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;

const apiClient: AxiosInstance = axios.create({
  baseURL: normalizedBaseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default apiClient;