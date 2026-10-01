import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

export class AuthController {
  private authService: AuthService;
  private tokenService: TokenService;

  constructor() {
    this.authService = new AuthService();
    this.tokenService = new TokenService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.authService.registerUser(req.body);
      const token = this.tokenService.generateAccessToken(user.id, user.role);
      res.status(201).json({ user, token });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await this.authService.validateCredentials(email, password);
      const accessToken = this.tokenService.generateAccessToken(user.id, user.role);
      const refreshToken = this.tokenService.generateRefreshToken(user.id);
      res.json({ user, accessToken, refreshToken });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      const newAccessToken = this.tokenService.generateAccessToken(payload.userId, 'user');
      res.json({ accessToken: newAccessToken });
    } catch (error) {
      next(error);
    }
  };
}
