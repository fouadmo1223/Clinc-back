import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { QueryVisitsDto } from './dto/query-visits.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('visits')
@ApiBearerAuth()
@Controller('visits')
export class VisitsController {
  constructor(private visitsService: VisitsService) {}

  @Post()
  @RequirePermissions(Permission.VISITS_CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVisitDto) {
    return this.visitsService.create(requireClinicId(user), user, dto);
  }

  @Get()
  @RequirePermissions(Permission.VISITS_READ)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryVisitsDto) {
    return this.visitsService.findAll(requireClinicId(user), user, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.VISITS_READ)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.visitsService.findOne(requireClinicId(user), user, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.VISITS_UPDATE)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateVisitDto) {
    return this.visitsService.update(requireClinicId(user), id, dto);
  }
}
