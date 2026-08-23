import { IsString, Length, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  clinicSlug: string;

  @IsString()
  @MinLength(6)
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
