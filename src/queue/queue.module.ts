import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueueEntry, QueueEntrySchema } from './schemas/queue-entry.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QueueEntry.name, schema: QueueEntrySchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    NotificationsModule,
  ],
  providers: [QueueService],
  controllers: [QueueController],
  exports: [QueueService, MongooseModule],
})
export class QueueModule {}
