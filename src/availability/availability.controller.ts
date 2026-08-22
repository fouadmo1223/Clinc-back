import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Get()
  @RequirePermissions(Permission.APPOINTMENTS_READ)
  getAvailability(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryAvailabilityDto) {
    return this.availabilityService.getAvailableSlots(
      requireClinicId(user),
      query.doctorId,
      query.branchId,
      query.date,
      query.durationMinutes,
    );
  }
}
