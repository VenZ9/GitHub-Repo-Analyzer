import { UserModel } from '../models/user.model';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { logger } from '../utils/logger';

export class AuthService {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel();
  }

  async registerUser(dto: any) {
    const existing = await this.userModel.findByEmail(dto.email);
    if (existing) {
      throw new Error('Email already registered');
    }
    const passwordHash = await hashPassword(dto.password);
    const user = await this.userModel.create({
      email: dto.email,
      passwordHash,
      role: 'user'
    });
    logger.info(`User registered successfully: ${user.id}`);
    return user;
  }

  async validateCredentials(email: string, pass: string) {
    const user = await this.userModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    const valid = await verifyPassword(pass, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }
    return user;
  }
}
