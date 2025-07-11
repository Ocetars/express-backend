import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  status?: number;
  statusCode?: number;
}

export default (err: ApiError, req: Request, res: Response, _: NextFunction) => {
  console.error(`Error ${req.method} ${req.path}:`, err.stack);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : message,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    status,
    timestamp: new Date().toISOString(),
    path: req.path
  });
};