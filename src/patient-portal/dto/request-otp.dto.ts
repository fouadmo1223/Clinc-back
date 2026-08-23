import { IsEmail, IsString, MinLength, ValidateIf } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  clinicSlug: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @MinLength(6)
  phone?: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;
}
