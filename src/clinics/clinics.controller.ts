import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('clinics')
@ApiBearerAuth()
@Controller('clinics/me')
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  @Get()
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.findById(requireClinicId(user));
  }

  @Patch()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  updateMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.update(requireClinicId(user), dto as any);
  }
}
