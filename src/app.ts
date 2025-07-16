import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import playerRoutes from './routes/playerRoutes';
import errorHandler from './middleware/errorHandler';

dotenv.config();

// 环境变量验证
function validateEnvironment() {
  const requiredEnvVars = ['API_BASE_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ 缺少必要的环境变量:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n请检查以下文件中的环境变量配置:');
    console.error('   - .env 文件 (本地开发)');
    console.error('   - ecosystem.config.json (PM2 部署)');
    console.error('   - docker-compose.yml (Docker 部署)');
    process.exit(1);
  }
  
  console.log('✅ 环境变量验证通过');
  console.log(`   - API_BASE_URL: ${process.env.API_BASE_URL}`);
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - PORT: ${process.env.PORT || 8080}`);
}

// 验证环境变量
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL?.split(',').map(url => url.trim()) || ['http://localhost:3000'],
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
    environment: process.env.NODE_ENV || 'development',
    api_base_url: process.env.API_BASE_URL,
    port: PORT
  });
});

app.use('/api/player', playerRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`🌐 健康检查: http://localhost:${PORT}/health`);
  console.log(`📡 API基础地址: ${process.env.API_BASE_URL}`);
});