import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import playerRoutes from './routes/playerRoutes';
import authRoutes from './routes/authRoutes';
import userDataRoutes from './routes/userDataRoutes';
import errorHandler from './middleware/errorHandler';
import './config/database'; // 初始化数据库连接

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// 设置 trust proxy 为具体数量，而不是 true，以提高安全性
// 通常在云环境中有1层代理（负载均衡器）
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later.' },
  // 添加标准化的 IP 处理以防止端口号干扰
  keyGenerator: (req) => {
    // 移除可能的端口号，只保留 IP 地址
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return ip.replace(/:\d+[^:]*$/, '');
  }
});
app.use('/api', limiter);

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL?.split(',').map(url => url.trim()) || ['http://localhost:8080'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/health', (_, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    environment: process.env.NODE_ENV || 'development!',
  });
});

// 调试端点：检查 IP 地址和代理配置
app.get('/debug/ip', (req, res) => {
  res.json({
    ip: req.ip,
    ips: req.ips,
    remoteAddress: req.socket.remoteAddress,
    xForwardedFor: req.headers['x-forwarded-for'],
    trustProxy: app.get('trust proxy')
  });
});

app.use('/api/player', playerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userDataRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 Express Backend Server Started');
  console.log('=================================');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`Database Host: ${process.env.DB_HOST || 'unknown'}`);
  console.log(`API Base URL: ${process.env.API_BASE_URL || 'unknown'}`);
  console.log('=================================');
});