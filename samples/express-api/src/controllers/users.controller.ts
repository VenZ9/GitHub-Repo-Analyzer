import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const user = await this.usersService.findById(userId);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.usersService.findAll();
      res.json({ users });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await this.usersService.update(req.params.id, req.body);
      res.json({ user: updated });
    } catch (error) {
      next(error);
    }
  };
}
