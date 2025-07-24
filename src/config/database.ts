import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sr_quick',
  charset: 'utf8mb4',
  // 连接池配置
  connectionLimit: 10,
  // acquireTimeout: 60000,
  // timeout: 60000,
  // // 微信云托管优化配置
  // reconnect: true,
  multipleStatements: false,
  // SSL 配置（生产环境推荐）
  ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {})
};

// 创建连接池
export const pool = mysql.createPool(dbConfig);

// 数据库连接测试函数
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('数据库连接测试成功');
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    return false;
  }
}

// 重试连接函数（处理冷启动）
export async function connectWithRetry(maxRetries: number = 3, delay: number = 1000): Promise<mysql.PoolConnection> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const connection = await pool.getConnection();
      return connection;
    } catch (error) {
      console.error(`数据库连接尝试 ${i + 1}/${maxRetries} 失败:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('数据库连接失败，已超过最大重试次数');
}

// 执行查询的包装函数
export async function executeQuery<T = any>(
  query: string, 
  params?: any[]
): Promise<T[]> {
  const connection = await connectWithRetry();
  try {
    const [rows] = await connection.execute(query, params);
    return rows as T[];
  } finally {
    connection.release();
  }
}

// 执行单条记录查询
export async function executeQuerySingle<T = any>(
  query: string, 
  params?: any[]
): Promise<T | null> {
  const results = await executeQuery<T>(query, params);
  return results.length > 0 ? results[0] : null;
}

// 执行插入并返回插入ID
export async function executeInsert(
  query: string, 
  params?: any[]
): Promise<number> {
  const connection = await connectWithRetry();
  try {
    const [result] = await connection.execute(query, params);
    return (result as any).insertId;
  } finally {
    connection.release();
  }
}

// 事务执行函数
export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await connectWithRetry();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 优雅关闭数据库连接池
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('数据库连接池已关闭');
  } catch (error) {
    console.error('关闭数据库连接池时出错:', error);
  }
}

// 应用启动时测试数据库连接
testConnection().catch(error => {
  console.error('应用启动时数据库连接失败:', error);
});

// 进程退出时关闭连接池
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});