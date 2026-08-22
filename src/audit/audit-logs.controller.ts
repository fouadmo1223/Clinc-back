import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryAuditLogsDto) {
    return this.auditLogsService.findAll(requireClinicId(user), query);
  }

  @Get('resources')
  @RequirePermissions(Permission.AUDIT_READ)
  listResources(@CurrentUser() user: AuthenticatedUser) {
    return this.auditLogsService.listResources(requireClinicId(user));
  }
}
