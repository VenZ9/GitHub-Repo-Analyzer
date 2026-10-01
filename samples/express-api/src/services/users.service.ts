import { UserModel, UserRecord } from '../models/user.model';

export class UsersService {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel();
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.userModel.findById(id);
  }

  async findAll(): Promise<UserRecord[]> {
    return this.userModel.findAll();
  }

  async update(id: string, updates: Partial<UserRecord>): Promise<UserRecord> {
    return this.userModel.update(id, updates);
  }
}
