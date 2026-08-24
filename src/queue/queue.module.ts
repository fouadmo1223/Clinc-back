import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueEntry, QueueEntrySchema } from './schemas/queue-entry.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueGateway } from './queue.gateway';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QueueEntry.name, schema: QueueEntrySchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    NotificationsModule,
  ],
  providers: [QueueService, QueueGateway],
  controllers: [QueueController],
  exports: [QueueService, MongooseModule],
})
export class QueueModule {}
