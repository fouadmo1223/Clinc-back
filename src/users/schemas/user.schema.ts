import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Role } from '../../common/constants/roles.enum';
import { Permission } from '../../common/constants/permissions.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ select: false })
  passwordHash: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true, enum: Role, index: true })
  role: Role;

  /**
   * Additive/subtractive permission overrides on top of the role's
   * ROLE_DEFAULT_PERMISSIONS. Empty for most users.
   */
  @Prop({ type: [String], enum: Permission, default: [] })
  grantedPermissions: Permission[];

  @Prop({ type: [String], enum: Permission, default: [] })
  revokedPermissions: Permission[];

  // Tenant isolation boundary. Null only for SUPER_ADMIN.
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', index: true, default: null })
  clinicId: Types.ObjectId | null;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'Branch', default: [] })
  branchIds: Types.ObjectId[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Doctor', default: null })
  doctorId?: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Staff', default: null })
  staffId?: Types.ObjectId | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 'en', enum: ['en', 'ar'] })
  preferredLanguage: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ select: false })
  passwordResetTokenHash?: string;

  @Prop({ select: false })
  passwordResetExpiresAt?: Date;

  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1, clinicId: 1 }, { unique: true });
