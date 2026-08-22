import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueueEntry, QueueEntrySchema } from './schemas/queue-entry.schema';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: QueueEntry.name, schema: QueueEntrySchema }]), PatientsModule, DoctorsModule],
  providers: [QueueService],
  controllers: [QueueController],
  exports: [QueueService, MongooseModule],
})
export class QueueModule {}
