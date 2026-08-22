import { IsEnum } from 'class-validator';
import { QueueStatus } from '../schemas/queue-entry.schema';

export class UpdateQueueEntryDto {
  @IsEnum(QueueStatus)
  status: QueueStatus;
}
