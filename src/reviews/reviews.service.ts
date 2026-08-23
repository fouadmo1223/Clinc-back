import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { Visit, VisitDocument, VisitStatus } from '../visits/schemas/visit.schema';
import { CreateReviewDto } from './dto/create-review.dto';

export interface DoctorRatingSummary {
  average: number;
  count: number;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Visit.name) private visitModel: Model<VisitDocument>,
  ) {}

  async create(clinicId: string, patientId: string, dto: CreateReviewDto): Promise<ReviewDocument> {
    const completedVisit = await this.visitModel.findOne({
      clinicId,
      patientId,
      doctorId: dto.doctorId,
      status: VisitStatus.COMPLETED,
    });
    if (!completedVisit) {
      throw new ForbiddenException('You can only review a doctor after a completed visit with them');
    }

    const existing = await this.reviewModel.findOne({ clinicId, patientId, doctorId: dto.doctorId });
    if (existing) throw new ConflictException('You have already reviewed this doctor');

    return this.reviewModel.create({
      clinicId: new Types.ObjectId(clinicId),
      doctorId: new Types.ObjectId(dto.doctorId),
      patientId: new Types.ObjectId(patientId),
      visitId: completedVisit._id,
      rating: dto.rating,
      comment: dto.comment,
    });
  }

  /** Batched avg+count per doctor — used by the public doctor listing so it's one query, not N. */
  async getSummaries(doctorIds: string[]): Promise<Map<string, DoctorRatingSummary>> {
    if (doctorIds.length === 0) return new Map();
    const rows = await this.reviewModel.aggregate([
      { $match: { doctorId: { $in: doctorIds.map((id) => new Types.ObjectId(id)) } } },
      { $group: { _id: '$doctorId', average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [r._id.toString(), { average: Math.round(r.average * 10) / 10, count: r.count }]));
  }

  /** Public review listing — never exposes the reviewing patient's identity. */
  async listForDoctor(clinicId: string, doctorId: string) {
    return this.reviewModel
      .find({ clinicId, doctorId }, { rating: 1, comment: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(50);
  }
}
