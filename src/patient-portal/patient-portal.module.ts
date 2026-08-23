import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { ClinicsModule } from '../clinics/clinics.module';
import { SmsModule } from '../common/sms/sms.module';
import { MailModule } from '../mail/mail.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AvailabilityModule } from '../availability/availability.module';
import { VisitsModule } from '../visits/visits.module';
import { DocumentsModule } from '../documents/documents.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { BranchesModule } from '../branches/branches.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PatientPortalAuthService } from './patient-portal-auth.service';
import { PatientPortalController } from './patient-portal.controller';
import { PatientJwtStrategy } from './strategies/patient-jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
    ClinicsModule,
    SmsModule,
    MailModule,
    AppointmentsModule,
    AvailabilityModule,
    VisitsModule,
    DocumentsModule,
    DoctorsModule,
    BranchesModule,
    ReviewsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.patientSecret'),
        signOptions: { expiresIn: config.get<string>('jwt.patientExpiresIn') },
      }),
    }),
  ],
  controllers: [PatientPortalController],
  providers: [PatientPortalAuthService, PatientJwtStrategy],
})
export class PatientPortalModule {}
