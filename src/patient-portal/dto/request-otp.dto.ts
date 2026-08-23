import { IsString, MinLength } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  clinicSlug: string;

  @IsString()
  @MinLength(6)
  phone: string;
}
