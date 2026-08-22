import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicDocument, ClinicDocumentSchema } from './schemas/document.schema';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PatientsModule } from '../patients/patients.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ClinicDocument.name, schema: ClinicDocumentSchema }]),
    PatientsModule,
    CloudinaryModule,
  ],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService, MongooseModule],
})
export class DocumentsModule {}
