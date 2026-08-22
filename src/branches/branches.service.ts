import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(@InjectModel(Branch.name) private branchModel: Model<BranchDocument>) {}

  async create(clinicId: string, dto: CreateBranchDto): Promise<BranchDocument> {
    return this.branchModel.create({ ...dto, clinicId: new Types.ObjectId(clinicId) });
  }

  async findAll(clinicId: string, includeInactive = false): Promise<BranchDocument[]> {
    const filter: Record<string, unknown> = { clinicId };
    if (!includeInactive) filter.isActive = true;
    return this.branchModel.find(filter).sort({ createdAt: 1 });
  }

  async findOne(clinicId: string, id: string): Promise<BranchDocument> {
    const branch = await this.branchModel.findById(id);
    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    return branch;
  }

  async update(clinicId: string, id: string, dto: UpdateBranchDto): Promise<BranchDocument> {
    const branch = await this.findOne(clinicId, id);
    Object.assign(branch, dto);
    await branch.save();
    return branch;
  }

  async deactivate(clinicId: string, id: string): Promise<BranchDocument> {
    const branch = await this.findOne(clinicId, id);
    branch.isActive = false;
    await branch.save();
    return branch;
  }
}
