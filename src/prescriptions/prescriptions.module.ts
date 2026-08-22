import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Prescription, PrescriptionSchema } from './schemas/prescription.schema';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { VisitsModule } from '../visits/visits.module';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Prescription.name, schema: PrescriptionSchema }]),
    VisitsModule,
    PatientsModule,
    DoctorsModule,
  ],
  providers: [PrescriptionsService],
  controllers: [PrescriptionsController],
  exports: [PrescriptionsService, MongooseModule],
})
export class PrescriptionsModule {}
