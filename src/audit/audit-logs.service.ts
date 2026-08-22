import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

export interface RecordAuditEntryInput {
  clinicId: string;
  userId: string;
  userName: string;
  role: string;
  method: string;
  path: string;
  resource: string;
  resourceId?: string;
  description: string;
  statusCode: number;
  ipAddress?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger('AuditLog');

  constructor(@InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>) {}

  /** Fire-and-forget from the interceptor — a logging failure must never break the actual request. */
  async record(entry: RecordAuditEntryInput): Promise<void> {
    try {
      await this.auditLogModel.create(entry);
    } catch (err) {
      this.logger.warn(`Failed to record audit entry: ${(err as Error).message}`);
    }
  }

  async findAll(clinicId: string, query: QueryAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;

    const filter: Record<string, unknown> = { clinicId };
    if (query.userId) filter.userId = query.userId;
    if (query.resource) filter.resource = query.resource;
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(query.from);
      // A date-only `to` parses as that day's UTC midnight — comparing the
      // full createdAt timestamp against it would exclude everything from
      // later that same day, so widen the upper bound to end-of-day.
      if (query.to) range.$lte = new Date(new Date(query.to).getTime() + 24 * 60 * 60 * 1000 - 1);
      filter.createdAt = range;
    }

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.auditLogModel.countDocuments(filter),
    ]);

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async listResources(clinicId: string): Promise<string[]> {
    return this.auditLogModel.distinct('resource', { clinicId });
  }
}
