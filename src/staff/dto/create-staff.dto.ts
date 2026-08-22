import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Role } from '../../common/constants/roles.enum';
import { Permission } from '../../common/constants/permissions.enum';

const STAFF_ROLES = [Role.RECEPTIONIST, Role.NURSE, Role.ACCOUNTANT] as const;

export class CreateStaffDto {
  @IsString()
  fullName: string;

  @IsIn(STAFF_ROLES)
  role: Role;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  branchIds: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  grantedPermissions?: Permission[];

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  revokedPermissions?: Permission[];
}
