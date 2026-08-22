import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Post()
  @RequirePermissions(Permission.STAFF_MANAGE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStaffDto) {
    return this.staffService.create(requireClinicId(user), dto);
  }

  @Get()
  @RequirePermissions(Permission.STAFF_READ)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('includeInactive') includeInactive?: string) {
    return this.staffService.findAll(requireClinicId(user), includeInactive === 'true');
  }

  @Get(':id')
  @RequirePermissions(Permission.STAFF_READ)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.staffService.findOne(requireClinicId(user), id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(requireClinicId(user), id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.staffService.deactivate(requireClinicId(user), id);
  }
}
