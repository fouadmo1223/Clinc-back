import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Deliberately a much smaller surface than UpdatePatientDto — no phone (that's the login
 * identifier, changing it here would be confusing/risky) and no medical fields (those stay
 * staff-controlled, gated behind patients.medical.update in the staff-facing endpoint).
 */
export class UpdateOwnProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;
}
