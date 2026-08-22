import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Patient, PatientDocument } from './schemas/patient.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { Permission } from '../common/constants/permissions.enum';

const MEDICAL_FIELDS = ['allergies', 'chronicConditions', 'currentMedications'] as const;

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class PatientsService {
  constructor(@InjectModel(Patient.name) private patientModel: Model<PatientDocument>) {}

  private canSeeMedical(user: AuthenticatedUser): boolean {
    return user.role === 'SUPER_ADMIN' || user.permissions.includes(Permission.PATIENTS_MEDICAL_READ);
  }

  private sanitize(patient: PatientDocument, user: AuthenticatedUser) {
    const obj = patient.toObject();
    if (!this.canSeeMedical(user)) {
      for (const field of MEDICAL_FIELDS) delete (obj as Record<string, unknown>)[field];
    }
    return obj;
  }

  async create(clinicId: string, user: AuthenticatedUser, dto: CreatePatientDto): Promise<Record<string, unknown>> {
    const patient = await this.patientModel.create({
      ...dto,
      clinicId: new Types.ObjectId(clinicId),
      createdBy: new Types.ObjectId(user.userId),
    });
    return this.sanitize(patient, user);
  }

  async findAll(clinicId: string, user: AuthenticatedUser, query: QueryPatientsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filter: FilterQuery<PatientDocument> = { clinicId, isActive: true };
    if (query.search?.trim()) {
      const term = escapeRegex(query.search.trim());
      const or: FilterQuery<PatientDocument>[] = [
        { fullName: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ];
      if (Types.ObjectId.isValid(query.search.trim())) {
        or.push({ _id: new Types.ObjectId(query.search.trim()) });
      }
      filter.$or = or;
    }

    const [items, total] = await Promise.all([
      this.patientModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.patientModel.countDocuments(filter),
    ]);

    return {
      items: items.map((p) => this.sanitize(p, user)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private async findRaw(clinicId: string, id: string): Promise<PatientDocument> {
    const patient = await this.patientModel.findById(id);
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    return patient;
  }

  async findOne(clinicId: string, user: AuthenticatedUser, id: string) {
    const patient = await this.findRaw(clinicId, id);
    return this.sanitize(patient, user);
  }

  async update(clinicId: string, user: AuthenticatedUser, id: string, dto: UpdatePatientDto) {
    const patient = await this.findRaw(clinicId, id);

    const touchesMedical = MEDICAL_FIELDS.some((f) => dto[f] !== undefined);
    if (touchesMedical && !user.permissions.includes(Permission.PATIENTS_MEDICAL_UPDATE) && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Missing permission: patients.medical.update');
    }

    Object.assign(patient, dto);
    await patient.save();
    return this.sanitize(patient, user);
  }

  async deactivate(clinicId: string, user: AuthenticatedUser, id: string) {
    const patient = await this.findRaw(clinicId, id);
    patient.isActive = false;
    await patient.save();
    return this.sanitize(patient, user);
  }
}
