import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { WorkingHoursDto } from '../../branches/dto/working-hours.dto';

class AppointmentSettingsDto {
  @IsOptional() @IsInt() @Min(5) defaultDurationMinutes?: number;
  @IsOptional() @IsInt() @Min(0) bookingLeadTimeMinutes?: number;
  @IsOptional() @IsInt() @Min(1) maxAdvanceBookingDays?: number;
  @IsOptional() @IsBoolean() allowOnlineBooking?: boolean;
  @IsOptional() @IsBoolean() allowWalkIns?: boolean;
  @IsOptional() @IsBoolean() requireConfirmation?: boolean;
}

export class UpdateClinicDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() contactEmail?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  contactPhones?: string[];

  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AppointmentSettingsDto)
  appointmentSettings?: AppointmentSettingsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];
}
