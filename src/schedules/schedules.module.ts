import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorSchedule, DoctorScheduleSchema } from './schemas/doctor-schedule.schema';
import { ScheduleException, ScheduleExceptionSchema } from './schemas/schedule-exception.schema';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DoctorSchedule.name, schema: DoctorScheduleSchema },
      { name: ScheduleException.name, schema: ScheduleExceptionSchema },
    ]),
  ],
  providers: [SchedulesService],
  controllers: [SchedulesController],
  exports: [SchedulesService, MongooseModule],
})
export class SchedulesModule {}
