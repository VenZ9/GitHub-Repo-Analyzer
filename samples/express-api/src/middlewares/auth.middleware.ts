import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';

const tokenService = new TokenService();

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = tokenService.verifyAccessToken(token);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== requiredRole) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
    }
    next();
  };
}
