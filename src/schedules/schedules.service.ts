import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DoctorSchedule, DoctorScheduleDocument } from './schemas/doctor-schedule.schema';
import {
  ScheduleException,
  ScheduleExceptionDocument,
  ScheduleExceptionType,
  isFullDayExceptionType,
} from './schemas/schedule-exception.schema';
import { SetWeeklyScheduleDto } from './dto/set-weekly-schedule.dto';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { parseTime, TimeRange } from '../common/utils/time.util';
import { DoctorsService } from '../doctors/doctors.service';

/** Confirms the doctor belongs to this clinic and is actually assigned to the given branch — mirrors the same check in AppointmentsService.create(). */
async function assertDoctorInBranch(doctorsService: DoctorsService, clinicId: string, doctorId: string, branchId: string): Promise<void> {
  const doctor = await doctorsService.findOne(clinicId, doctorId);
  if (!doctor.branchIds.some((b) => b.toString() === branchId)) {
    throw new ConflictException('Doctor is not assigned to this branch');
  }
}

function startOfUtcDay(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export interface EffectiveDayInfo {
  isFullyClosed: boolean;
  closureReason?: string;
  workingRanges: TimeRange[];
  blockedRanges: TimeRange[];
}

@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(DoctorSchedule.name) private scheduleModel: Model<DoctorScheduleDocument>,
    @InjectModel(ScheduleException.name) private exceptionModel: Model<ScheduleExceptionDocument>,
    private doctorsService: DoctorsService,
  ) {}

  async setWeeklySchedule(clinicId: string, doctorId: string, branchId: string, dto: SetWeeklyScheduleDto) {
    await assertDoctorInBranch(this.doctorsService, clinicId, doctorId, branchId);

    const ops = dto.days.map((day) => ({
      updateOne: {
        filter: { clinicId, doctorId, branchId, dayOfWeek: day.dayOfWeek },
        update: {
          $set: {
            clinicId: new Types.ObjectId(clinicId),
            doctorId: new Types.ObjectId(doctorId),
            branchId: new Types.ObjectId(branchId),
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            breaks: day.breaks ?? [],
            isClosed: day.isClosed ?? false,
          },
        },
        upsert: true,
      },
    }));
    if (ops.length > 0) await this.scheduleModel.bulkWrite(ops);
    return this.getWeeklySchedule(clinicId, doctorId, branchId);
  }

  async getWeeklySchedule(clinicId: string, doctorId: string, branchId: string) {
    const entries = await this.scheduleModel.find({ clinicId, doctorId, branchId }).sort({ dayOfWeek: 1 });
    return entries;
  }

  async createException(clinicId: string, userId: string, dto: CreateScheduleExceptionDto) {
    await assertDoctorInBranch(this.doctorsService, clinicId, dto.doctorId, dto.branchId);

    return this.exceptionModel.create({
      clinicId: new Types.ObjectId(clinicId),
      doctorId: new Types.ObjectId(dto.doctorId),
      branchId: new Types.ObjectId(dto.branchId),
      date: startOfUtcDay(dto.date),
      type: dto.type,
      startTime: dto.startTime,
      endTime: dto.endTime,
      reason: dto.reason,
      createdBy: new Types.ObjectId(userId),
    });
  }

  async listExceptions(clinicId: string, doctorId: string, branchId: string, from?: string, to?: string) {
    const filter: Record<string, unknown> = { clinicId, doctorId, branchId };
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = startOfUtcDay(from);
      if (to) range.$lte = startOfUtcDay(to);
      filter.date = range;
    }
    return this.exceptionModel.find(filter).sort({ date: 1 });
  }

  async deleteException(clinicId: string, id: string) {
    const exception = await this.exceptionModel.findById(id);
    if (!exception) throw new NotFoundException('Schedule exception not found');
    if (exception.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    await exception.deleteOne();
    return { deleted: true };
  }

  /**
   * Combines the doctor's recurring weekly schedule with any exceptions on
   * the given date into the final set of working/blocked ranges for that day.
   * This is the single source of truth the availability engine builds on.
   */
  async getEffectiveDayInfo(
    clinicId: string,
    doctorId: string,
    branchId: string,
    dateStr: string,
  ): Promise<EffectiveDayInfo> {
    const date = startOfUtcDay(dateStr);
    const dayOfWeek = date.getUTCDay();

    const [base, exceptions] = await Promise.all([
      this.scheduleModel.findOne({ clinicId, doctorId, branchId, dayOfWeek }),
      this.exceptionModel.find({ clinicId, doctorId, branchId, date }),
    ]);

    const fullDayClosure = exceptions.find((e) => isFullDayExceptionType(e.type));
    if (fullDayClosure) {
      return { isFullyClosed: true, closureReason: fullDayClosure.reason ?? fullDayClosure.type, workingRanges: [], blockedRanges: [] };
    }

    let workingRanges: TimeRange[] =
      base && !base.isClosed ? [{ start: parseTime(base.startTime), end: parseTime(base.endTime) }] : [];

    const blockedRanges: TimeRange[] = (base?.breaks ?? []).map((b) => ({
      start: parseTime(b.startTime),
      end: parseTime(b.endTime),
    }));

    for (const exception of exceptions) {
      if (!exception.startTime || !exception.endTime) continue;
      const range = { start: parseTime(exception.startTime), end: parseTime(exception.endTime) };

      if (exception.type === ScheduleExceptionType.CUSTOM_HOURS) {
        workingRanges = [range];
      } else if (exception.type === ScheduleExceptionType.EXTRA_HOURS) {
        workingRanges.push(range);
      } else if (
        exception.type === ScheduleExceptionType.PARTIAL_DAY_LEAVE ||
        exception.type === ScheduleExceptionType.BLOCKED_TIME
      ) {
        blockedRanges.push(range);
      }
    }

    return { isFullyClosed: false, workingRanges, blockedRanges };
  }
}
