import { IsEmail, IsString, Length, MinLength, ValidateIf } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  clinicSlug: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @MinLength(6)
  phone?: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
