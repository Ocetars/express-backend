import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import playerRoutes from './routes/playerRoutes';
import errorHandler from './middleware/errorHandler';

dotenv.config();

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
    environment: process.env.NODE_ENV || 'development!',
  });
});

app.use('/api/player', playerRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});