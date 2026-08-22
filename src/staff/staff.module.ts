import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Staff, StaffSchema } from './schemas/staff.schema';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Staff.name, schema: StaffSchema }]), AuthModule, UsersModule],
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService, MongooseModule],
})
export class StaffModule {}
