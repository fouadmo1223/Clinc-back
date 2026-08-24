import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PatientPortalAuthService } from './patient-portal-auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelOwnAppointmentDto } from './dto/cancel-own-appointment.dto';
import { PatientJwtAuthGuard } from './guards/patient-jwt-auth.guard';
import { CurrentPatient } from './decorators/current-patient.decorator';
import { AuthenticatedPatient } from './strategies/patient-jwt.strategy';
import { Public } from '../common/decorators/public.decorator';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { PatientsService } from '../patients/patients.service';
import { UpdateOwnProfileDto } from '../patients/dto/update-own-profile.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { AvailabilityService } from '../availability/availability.service';
import { QueryAvailabilityDto } from '../availability/dto/query-availability.dto';
import { VisitsService } from '../visits/visits.service';
import { DocumentsService } from '../documents/documents.service';
import { PatientUploadDocumentDto } from '../documents/dto/patient-upload-document.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { BranchesService } from '../branches/branches.service';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';

@ApiTags('patient-portal')
@Controller('patient-portal')
export class PatientPortalController {
  constructor(
    private authService: PatientPortalAuthService,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private appointmentsService: AppointmentsService,
    private availabilityService: AvailabilityService,
    private visitsService: VisitsService,
    private documentsService: DocumentsService,
    private patientsService: PatientsService,
    private doctorsService: DoctorsService,
    private branchesService: BranchesService,
    private reviewsService: ReviewsService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('auth/request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.clinicSlug, dto.phone, dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('auth/register')
  register(@Body() dto: RegisterPatientDto) {
    return this.authService.register(dto.clinicSlug, dto.fullName, dto.phone, dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('auth/verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.clinicSlug, dto.phone, dto.email, dto.code);
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Get('me')
  async me(@CurrentPatient() patient: AuthenticatedPatient) {
    // Only safe, self-descriptive fields — never medical data or internal staff notes here.
    return this.patientModel.findById(patient.patientId, {
      fullName: 1,
      phone: 1,
      email: 1,
      gender: 1,
      dateOfBirth: 1,
    });
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Patch('me')
  async updateMe(@CurrentPatient() patient: AuthenticatedPatient, @Body() dto: UpdateOwnProfileDto) {
    return this.patientsService.updateSelf(patient.clinicId, patient.patientId, dto);
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Get('appointments')
  async appointments(@CurrentPatient() patient: AuthenticatedPatient) {
    return this.appointmentsService.findAll(patient.clinicId, { patientId: patient.patientId, limit: 100 });
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Post('appointments')
  async bookAppointment(@CurrentPatient() patient: AuthenticatedPatient, @Body() dto: BookAppointmentDto) {
    return this.appointmentsService.create(patient.clinicId, { ...dto, patientId: patient.patientId });
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Post('appointments/:id/cancel')
  async cancelAppointment(
    @CurrentPatient() patient: AuthenticatedPatient,
    @Param('id') id: string,
    @Body() dto: CancelOwnAppointmentDto,
  ) {
    return this.appointmentsService.cancelByPatient(patient.clinicId, patient.patientId, id, dto.reason);
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Get('doctors')
  async doctors(@CurrentPatient() patient: AuthenticatedPatient) {
    return this.doctorsService.findAll(patient.clinicId, false);
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Get('branches')
  async branches(@CurrentPatient() patient: AuthenticatedPatient) {
    return this.branchesService.findAll(patient.clinicId, false);
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Get('availability')
  async availability(@CurrentPatient() patient: AuthenticatedPatient, @Query() query: QueryAvailabilityDto) {
    return this.availabilityService.getAvailableSlots(
      patient.clinicId,
      query.doctorId,
      query.branchId,
      query.date,
      query.durationMinutes,
    );
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Get('visits')
  async visits(@CurrentPatient() patient: AuthenticatedPatient) {
    return this.visitsService.findAll(patient.clinicId, { patientId: patient.patientId, limit: 100 });
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Get('documents')
  async documents(@CurrentPatient() patient: AuthenticatedPatient) {
    return this.documentsService.findAll(patient.clinicId, { patientId: patient.patientId });
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentPatient() patient: AuthenticatedPatient,
    @Body() dto: PatientUploadDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentsService.uploadByPatient(patient.clinicId, patient.patientId, dto, file);
  }

  @Public()
  @UseGuards(PatientJwtAuthGuard)
  @Post('reviews')
  async createReview(@CurrentPatient() patient: AuthenticatedPatient, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(patient.clinicId, patient.patientId, dto);
  }
}
