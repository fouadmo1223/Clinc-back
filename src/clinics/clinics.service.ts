import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic, ClinicDocument } from './schemas/clinic.schema';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class ClinicsService {
  constructor(@InjectModel(Clinic.name) private clinicModel: Model<ClinicDocument>) {}

  async create(data: Partial<Clinic>): Promise<ClinicDocument> {
    let slug = slugify(data.name ?? 'clinic');
    let attempt = 0;
    while (await this.clinicModel.exists({ slug: attempt ? `${slug}-${attempt}` : slug })) {
      attempt += 1;
    }
    slug = attempt ? `${slug}-${attempt}` : slug;

    return this.clinicModel.create({ ...data, slug });
  }

  async findById(id: string): Promise<ClinicDocument> {
    const clinic = await this.clinicModel.findById(id);
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  async findByIdRaw(id: string | Types.ObjectId) {
    return this.clinicModel.findById(id);
  }

  async update(id: string, data: Partial<Clinic>): Promise<ClinicDocument> {
    const clinic = await this.findById(id);
    Object.assign(clinic, data);
    await clinic.save();
    return clinic;
  }
}
