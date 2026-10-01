import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dna-secret-key-prod';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dna-refresh-secret-prod';

export class TokenService {
  generateAccessToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
  }

  verifyAccessToken(token: string): any {
    return jwt.verify(token, JWT_SECRET);
  }

  verifyRefreshToken(token: string): any {
    return jwt.verify(token, REFRESH_SECRET);
  }
}
