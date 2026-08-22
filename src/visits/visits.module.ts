import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './schemas/visit.schema';
import { VisitsService } from './visits.service';
import { VisitsController } from './visits.controller';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }]),
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
  ],
  providers: [VisitsService],
  controllers: [VisitsController],
  exports: [VisitsService, MongooseModule],
})
export class VisitsModule {}
