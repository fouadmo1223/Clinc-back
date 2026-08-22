import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Staff, StaffDocument } from './schemas/staff.schema';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Staff.name) private staffModel: Model<StaffDocument>,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  async create(clinicId: string, dto: CreateStaffDto): Promise<StaffDocument> {
    const staff = await this.staffModel.create({
      ...dto,
      clinicId: new Types.ObjectId(clinicId),
      branchIds: dto.branchIds.map((id) => new Types.ObjectId(id)),
    });

    const user = await this.authService.createInvitedUser({
      fullName: dto.fullName,
      email: dto.email,
      role: dto.role,
      clinicId,
      branchIds: dto.branchIds,
      staffId: staff.id,
    });

    staff.userId = user._id as Types.ObjectId;
    await staff.save();
    return staff;
  }

  async findAll(clinicId: string, includeInactive = false): Promise<StaffDocument[]> {
    const filter: Record<string, unknown> = { clinicId };
    if (!includeInactive) filter.isActive = true;
    return this.staffModel.find(filter).sort({ createdAt: 1 });
  }

  async findOne(clinicId: string, id: string): Promise<StaffDocument> {
    const staff = await this.staffModel.findById(id);
    if (!staff) throw new NotFoundException('Staff member not found');
    if (staff.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    return staff;
  }

  async update(clinicId: string, id: string, dto: UpdateStaffDto): Promise<StaffDocument> {
    const staff = await this.findOne(clinicId, id);
    const { branchIds, ...rest } = dto;
    Object.assign(staff, rest);
    if (branchIds) staff.branchIds = branchIds.map((bId) => new Types.ObjectId(bId));
    await staff.save();

    if (staff.userId) {
      await this.usersService.updateLinkedProfile(staff.userId.toString(), {
        fullName: staff.fullName,
        phone: staff.phone,
        branchIds: staff.branchIds,
        grantedPermissions: staff.grantedPermissions,
        revokedPermissions: staff.revokedPermissions,
        isActive: staff.isActive,
      });
    }
    return staff;
  }

  async deactivate(clinicId: string, id: string): Promise<StaffDocument> {
    const staff = await this.findOne(clinicId, id);
    staff.isActive = false;
    await staff.save();
    if (staff.userId) {
      await this.usersService.updateLinkedProfile(staff.userId.toString(), { isActive: false });
    }
    return staff;
  }
}
