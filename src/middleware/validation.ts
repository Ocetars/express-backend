import { param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateUID = [
  param('uid')
    .isNumeric()
    .withMessage('UID must be numeric')
    .isLength({ min: 9, max: 10 })
    .withMessage('UID must be 9-10 digits'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }
    next();
  }
];