import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClinicsModule } from './clinics/clinics.module';
import { BranchesModule } from './branches/branches.module';
import { DoctorsModule } from './doctors/doctors.module';
import { StaffModule } from './staff/staff.module';
import { PatientsModule } from './patients/patients.module';
import { SchedulesModule } from './schedules/schedules.module';
import { AvailabilityModule } from './availability/availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { VisitsModule } from './visits/visits.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ClinicsModule,
    BranchesModule,
    DoctorsModule,
    StaffModule,
    PatientsModule,
    SchedulesModule,
    AvailabilityModule,
    AppointmentsModule,
    VisitsModule,
    PrescriptionsModule,
    InvoicesModule,
    PaymentsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
