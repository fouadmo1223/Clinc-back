import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterPatientDto {
  @IsString()
  clinicSlug: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @MinLength(6)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
