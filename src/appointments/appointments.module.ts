import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppointmentRemindersCron } from './appointment-reminders.cron';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
    PatientsModule,
    DoctorsModule,
    SchedulesModule,
    NotificationsModule,
  ],
  providers: [AppointmentsService, AppointmentRemindersCron],
  controllers: [AppointmentsController],
  exports: [AppointmentsService, MongooseModule],
})
export class AppointmentsModule {}
