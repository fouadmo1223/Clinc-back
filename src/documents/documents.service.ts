import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ClinicDocument, ClinicDocumentDocument, DocumentCategory } from './schemas/document.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { UploadDocumentDto, ALLOWED_DOCUMENT_MIME_TYPES } from './dto/upload-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(ClinicDocument.name) private documentModel: Model<ClinicDocumentDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private cloudinary: CloudinaryService,
  ) {}

  async upload(clinicId: string, user: AuthenticatedUser, dto: UploadDocumentDto, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('A file is required');
    if (file.size > MAX_FILE_SIZE_BYTES) throw new BadRequestException('File exceeds the 15MB limit');
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP, DOC, DOCX');
    }

    const patient = await this.patientModel.findById(dto.patientId);
    if (!patient || patient.clinicId.toString() !== clinicId) throw new NotFoundException('Patient not found');

    const result = await this.cloudinary.uploadBuffer(file.buffer, `clinic/${clinicId}/patients/${dto.patientId}`);

    const document = await this.documentModel.create({
      clinicId: new Types.ObjectId(clinicId),
      patientId: new Types.ObjectId(dto.patientId),
      visitId: dto.visitId ? new Types.ObjectId(dto.visitId) : undefined,
      fileName: file.originalname,
      fileUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      category: dto.category ?? DocumentCategory.OTHER,
      notes: dto.notes,
      uploadedBy: new Types.ObjectId(user.userId),
    });

    return document;
  }

  /**
   * Patient uploading their own document via the portal (e.g. an external lab result they
   * want their doctor to see). patientId comes from the JWT, never the request body, so a
   * patient can never attach a document to someone else's record. No uploadedBy — that field
   * is a staff-user reference and patients don't have one.
   */
  async uploadByPatient(clinicId: string, patientId: string, dto: Pick<UploadDocumentDto, 'category' | 'notes'>, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('A file is required');
    if (file.size > MAX_FILE_SIZE_BYTES) throw new BadRequestException('File exceeds the 15MB limit');
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP, DOC, DOCX');
    }

    const result = await this.cloudinary.uploadBuffer(file.buffer, `clinic/${clinicId}/patients/${patientId}`);

    return this.documentModel.create({
      clinicId: new Types.ObjectId(clinicId),
      patientId: new Types.ObjectId(patientId),
      fileName: file.originalname,
      fileUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      category: dto.category ?? DocumentCategory.OTHER,
      notes: dto.notes,
    });
  }

  async findAll(clinicId: string, query: QueryDocumentsDto) {
    const filter: FilterQuery<ClinicDocumentDocument> = { clinicId };
    if (query.patientId) filter.patientId = query.patientId;
    if (query.visitId) filter.visitId = query.visitId;
    return this.documentModel.find(filter).sort({ createdAt: -1 });
  }

  async remove(clinicId: string, id: string) {
    const document = await this.documentModel.findById(id);
    if (!document) throw new NotFoundException('Document not found');
    if (document.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');

    await this.cloudinary.destroy(document.cloudinaryPublicId);
    await document.deleteOne();
    return { deleted: true };
  }
}
