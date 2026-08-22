import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateQueueEntryDto } from './dto/update-queue-entry.dto';
import { QueryQueueDto } from './dto/query-queue.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('queue')
@ApiBearerAuth()
@Controller('queue')
export class QueueController {
  constructor(private queueService: QueueService) {}

  @Post()
  @RequirePermissions(Permission.QUEUE_MANAGE)
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckInDto) {
    return this.queueService.checkIn(requireClinicId(user), user, dto);
  }

  @Get()
  @RequirePermissions(Permission.QUEUE_MANAGE)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryQueueDto) {
    return this.queueService.findAll(requireClinicId(user), query);
  }

  @Patch(':id')
  @RequirePermissions(Permission.QUEUE_MANAGE)
  updateStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateQueueEntryDto) {
    return this.queueService.updateStatus(requireClinicId(user), id, dto);
  }
}
