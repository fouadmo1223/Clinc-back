import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from './schemas/doctor.schema';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]), AuthModule],
  providers: [DoctorsService],
  controllers: [DoctorsController],
  exports: [DoctorsService, MongooseModule],
})
export class DoctorsModule {}
