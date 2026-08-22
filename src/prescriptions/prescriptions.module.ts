import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Prescription, PrescriptionSchema } from './schemas/prescription.schema';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { VisitsModule } from '../visits/visits.module';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { ClinicsModule } from '../clinics/clinics.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Prescription.name, schema: PrescriptionSchema }]),
    VisitsModule,
    PatientsModule,
    DoctorsModule,
    ClinicsModule,
  ],
  providers: [PrescriptionsService],
  controllers: [PrescriptionsController],
  exports: [PrescriptionsService, MongooseModule],
})
export class PrescriptionsModule {}
