import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('doctors')
@ApiBearerAuth()
@Controller('doctors')
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  @Post()
  @RequirePermissions(Permission.DOCTORS_MANAGE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(requireClinicId(user), dto);
  }

  @Get()
  @RequirePermissions(Permission.DOCTORS_READ)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('includeInactive') includeInactive?: string) {
    return this.doctorsService.findAll(requireClinicId(user), includeInactive === 'true');
  }

  @Get(':id')
  @RequirePermissions(Permission.DOCTORS_READ)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.doctorsService.findOne(requireClinicId(user), id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DOCTORS_MANAGE)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.update(requireClinicId(user), id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DOCTORS_MANAGE)
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.doctorsService.deactivate(requireClinicId(user), id);
  }
}
