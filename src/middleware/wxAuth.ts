import { Request, Response, NextFunction } from 'express';
import { WeChatHeaders } from '../types/user';

// 扩展 Request 接口以包含微信用户信息
declare global {
  namespace Express {
    interface Request {
      wxUser?: {
        openid: string;
        appid?: string;
        unionid?: string;
      };
    }
  }
}

/**
 * 微信认证中间件
 * 从微信云托管的请求头中提取用户身份信息
 * 
 * 微信云托管会自动在请求头中添加以下信息：
 * - x-wx-openid: 用户的openid
 * - x-wx-appid: 小程序的appid
 * - x-wx-unionid: 用户的unionid（如果有）
 */
export const wxAuth = (required: boolean = true) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 如果已经通过模拟认证设置了用户信息，直接使用
      if (req.wxUser) {
        console.log('微信认证中间件 - 使用已存在的用户信息:', {
          openid: req.wxUser.openid ? `${req.wxUser.openid.substring(0, 10)}...` : undefined,
          appid: req.wxUser.appid,
          unionid: req.wxUser.unionid ? `${req.wxUser.unionid.substring(0, 10)}...` : undefined
        });
        return next();
      }

      // 从请求头中获取微信用户信息
      const openid = req.headers['x-wx-openid'] as string;
      const appid = req.headers['x-wx-appid'] as string;
      const unionid = req.headers['x-wx-unionid'] as string;

      // 记录调试信息
      console.log('微信认证中间件 - 请求头信息:', {
        openid: openid ? `${openid.substring(0, 10)}...` : undefined,
        appid,
        unionid: unionid ? `${unionid.substring(0, 10)}...` : undefined,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer
      });

      // 记录前端环境信息
      const frontendEnv = req.headers['x-frontend-env'] as string;
      const frontendApiMode = req.headers['x-frontend-api-mode'] as string;
      const frontendApiUrl = req.headers['x-frontend-api-url'] as string;
      const frontendCloudEnv = req.headers['x-frontend-cloud-env'] as string;

      if (frontendEnv || frontendApiMode) {
        console.log('前端环境信息:', {
          env: frontendEnv || 'unknown',
          apiMode: frontendApiMode || 'unknown',
          apiUrl: frontendApiUrl,
          cloudEnv: frontendCloudEnv
        });
      }

      // 检查是否有必需的openid
      if (required && !openid) {
        return res.status(401).json({
          success: false,
          error: '未找到有效的用户身份信息，请确保通过微信小程序访问',
          code: 'MISSING_OPENID'
        });
      }

      // 如果有openid，将用户信息添加到request对象
      if (openid) {
        req.wxUser = {
          openid,
          appid,
          unionid
        };
      }

      next();
    } catch (error) {
      console.error('微信认证中间件错误:', error);
      res.status(500).json({
        success: false,
        error: '身份验证过程中发生错误',
        code: 'AUTH_ERROR'
      });
    }
  };
};

/**
 * 可选的微信认证中间件
 * 不强制要求用户身份，但如果有会提取出来
 */
export const wxAuthOptional = wxAuth(false);

/**
 * 必需的微信认证中间件
 * 强制要求用户身份，没有会返回401错误
 */
export const wxAuthRequired = wxAuth(true);

/**
 * 开发环境下的模拟认证中间件
 * 用于本地开发测试
 */
export const mockWxAuth = (req: Request, res: Response, next: NextFunction) => {
  // 只在开发环境下生效
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  // 如果已经有微信用户信息，直接跳过
  if (req.wxUser) {
    return next();
  }

  // 模拟用户信息，使用固定的openid以确保一致性
  const mockOpenid = req.headers['x-mock-openid'] as string || 'demo_openid_dev_user';
  const mockAppid = req.headers['x-mock-appid'] as string || 'demo_appid';
  const mockUnionid = req.headers['x-mock-unionid'] as string;

  req.wxUser = {
    openid: mockOpenid,
    appid: mockAppid,
    unionid: mockUnionid
  };

  console.log('开发环境模拟认证:', req.wxUser);
  next();
};

/**
 * 获取当前请求的用户openid
 * @param req Express请求对象
 * @returns 用户openid或null
 */
export function getCurrentUserOpenid(req: Request): string | null {
  return req.wxUser?.openid || null;
}

/**
 * 获取当前请求的完整用户信息
 * @param req Express请求对象
 * @returns 微信用户信息或null
 */
export function getCurrentWxUser(req: Request) {
  return req.wxUser || null;
}