import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Clinic, ClinicSchema } from './schemas/clinic.schema';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Clinic.name, schema: ClinicSchema }])],
  providers: [ClinicsService],
  controllers: [ClinicsController],
  exports: [ClinicsService, MongooseModule],
})
export class ClinicsModule {}
