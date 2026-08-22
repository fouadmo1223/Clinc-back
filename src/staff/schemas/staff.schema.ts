import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Role } from '../../common/constants/roles.enum';
import { Permission } from '../../common/constants/permissions.enum';

export type StaffDocument = Staff & Document;

const STAFF_ROLES = [Role.RECEPTIONIST, Role.NURSE, Role.ACCOUNTANT];

@Schema({ timestamps: true })
export class Staff {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, enum: STAFF_ROLES })
  role: Role;

  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'Branch', default: [] })
  branchIds: Types.ObjectId[];

  @Prop({ type: [String], enum: Permission, default: [] })
  grantedPermissions: Permission[];

  @Prop({ type: [String], enum: Permission, default: [] })
  revokedPermissions: Permission[];

  @Prop({ default: true })
  isActive: boolean;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);
StaffSchema.index({ clinicId: 1, isActive: 1 });
