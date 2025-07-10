import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default apiClient;