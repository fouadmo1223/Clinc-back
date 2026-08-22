import { Body, Controller, Get, Param, Patch, Post, Delete, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Post()
  @RequirePermissions(Permission.BRANCHES_MANAGE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(requireClinicId(user), dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('includeInactive') includeInactive?: string) {
    return this.branchesService.findAll(requireClinicId(user), includeInactive === 'true');
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.branchesService.findOne(requireClinicId(user), id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BRANCHES_MANAGE)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(requireClinicId(user), id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.BRANCHES_MANAGE)
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.branchesService.deactivate(requireClinicId(user), id);
  }
}
