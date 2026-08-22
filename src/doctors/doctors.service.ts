import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Doctor, DoctorDocument } from './schemas/doctor.schema';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { AuthService } from '../auth/auth.service';
import { Role } from '../common/constants/roles.enum';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectModel(Doctor.name) private doctorModel: Model<DoctorDocument>,
    private authService: AuthService,
  ) {}

  async create(clinicId: string, dto: CreateDoctorDto): Promise<DoctorDocument> {
    const doctor = await this.doctorModel.create({
      ...dto,
      clinicId: new Types.ObjectId(clinicId),
      branchIds: dto.branchIds.map((id) => new Types.ObjectId(id)),
    });

    const user = await this.authService.createInvitedUser({
      fullName: dto.fullName,
      email: dto.email,
      role: Role.DOCTOR,
      clinicId,
      branchIds: dto.branchIds,
      doctorId: doctor.id,
    });

    doctor.userId = user._id as Types.ObjectId;
    await doctor.save();
    return doctor;
  }

  async findByIds(clinicId: string, ids: string[]): Promise<DoctorDocument[]> {
    if (ids.length === 0) return [];
    return this.doctorModel.find({ _id: { $in: ids }, clinicId });
  }

  async findAll(clinicId: string, includeInactive = false): Promise<DoctorDocument[]> {
    const filter: Record<string, unknown> = { clinicId };
    if (!includeInactive) filter.isActive = true;
    return this.doctorModel.find(filter).sort({ createdAt: 1 });
  }

  async findOne(clinicId: string, id: string): Promise<DoctorDocument> {
    const doctor = await this.doctorModel.findById(id);
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    return doctor;
  }

  async update(clinicId: string, id: string, dto: UpdateDoctorDto): Promise<DoctorDocument> {
    const doctor = await this.findOne(clinicId, id);
    const { branchIds, ...rest } = dto;
    Object.assign(doctor, rest);
    if (branchIds) doctor.branchIds = branchIds.map((bId) => new Types.ObjectId(bId));
    await doctor.save();
    return doctor;
  }

  async deactivate(clinicId: string, id: string): Promise<DoctorDocument> {
    const doctor = await this.findOne(clinicId, id);
    doctor.isActive = false;
    await doctor.save();
    return doctor;
  }
}
