import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PaymentsModule } from '../payments/payments.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { VisitsModule } from '../visits/visits.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PaymentsModule, ExpensesModule, AppointmentsModule, VisitsModule, PatientsModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
