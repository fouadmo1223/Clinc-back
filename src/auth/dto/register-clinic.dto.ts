import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterClinicDto {
  @IsString()
  @MinLength(2)
  clinicName: string;

  @IsString()
  @MinLength(2)
  clinicNameAr: string;

  @IsString()
  clinicPhone: string;

  @IsString()
  @MinLength(2)
  ownerFullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
