import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { ROLE_DEFAULT_PERMISSIONS, Permission } from '../common/constants/permissions.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  async findByEmail(email: string, clinicId?: string | Types.ObjectId | null) {
    const query: Record<string, unknown> = { email: email.toLowerCase() };
    if (clinicId !== undefined) query.clinicId = clinicId;
    return this.userModel.findOne(query).select('+passwordHash');
  }

  async findById(id: string) {
    return this.userModel.findById(id);
  }

  async findByIdWithSecrets(id: string) {
    return this.userModel.findById(id).select('+refreshTokenHash +passwordHash');
  }

  async setRefreshTokenHash(userId: string, hash: string | null) {
    await this.userModel.updateOne({ _id: userId }, { refreshTokenHash: hash });
  }

  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    await this.userModel.updateOne(
      { _id: userId },
      { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
    );
  }

  async findByValidResetToken(tokenHash: string) {
    return this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+passwordResetTokenHash +passwordResetExpiresAt');
  }

  async setPassword(userId: string, passwordHash: string) {
    await this.userModel.updateOne(
      { _id: userId },
      {
        passwordHash,
        passwordResetTokenHash: undefined,
        passwordResetExpiresAt: undefined,
        $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
      },
    );
  }

  async updateLinkedProfile(
    userId: string,
    data: Partial<Pick<User, 'fullName' | 'phone' | 'branchIds' | 'grantedPermissions' | 'revokedPermissions' | 'isActive'>>,
  ) {
    await this.userModel.updateOne({ _id: userId }, data);
  }

  async touchLastLogin(userId: string) {
    await this.userModel.updateOne({ _id: userId }, { lastLoginAt: new Date() });
  }

  effectivePermissions(user: Pick<User, 'role' | 'grantedPermissions' | 'revokedPermissions'>): Permission[] {
    const base = new Set(ROLE_DEFAULT_PERMISSIONS[user.role] ?? []);
    for (const p of user.grantedPermissions ?? []) base.add(p);
    for (const p of user.revokedPermissions ?? []) base.delete(p);
    return Array.from(base);
  }
}
