export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export class UserModel {
  private users: Map<string, UserRecord> = new Map();

  async findByEmail(email: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.email === email) return u;
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) || null;
  }

  async create(data: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord> {
    const id = `usr_${Date.now()}`;
    const user: UserRecord = {
      ...data,
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async findAll(): Promise<UserRecord[]> {
    return Array.from(this.users.values());
  }

  async update(id: string, updates: Partial<UserRecord>): Promise<UserRecord> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('User not found');
    const updated = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }
}
