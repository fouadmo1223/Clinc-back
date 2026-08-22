import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicDocument, ClinicDocumentSchema } from './schemas/document.schema';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { CloudinaryService } from './cloudinary.service';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: ClinicDocument.name, schema: ClinicDocumentSchema }]), PatientsModule],
  providers: [DocumentsService, CloudinaryService],
  controllers: [DocumentsController],
  exports: [DocumentsService, MongooseModule],
})
export class DocumentsModule {}
