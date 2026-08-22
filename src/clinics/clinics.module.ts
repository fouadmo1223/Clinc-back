import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Clinic, ClinicSchema } from './schemas/clinic.schema';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Clinic.name, schema: ClinicSchema }]), CloudinaryModule],
  providers: [ClinicsService],
  controllers: [ClinicsController],
  exports: [ClinicsService, MongooseModule],
})
export class ClinicsModule {}
