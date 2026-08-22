import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { SchedulesModule } from '../schedules/schedules.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [SchedulesModule, DoctorsModule],
  providers: [AvailabilityService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
