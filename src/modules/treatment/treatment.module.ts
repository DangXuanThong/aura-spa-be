import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreatmentCourse } from './entities/treatment-course.entity';
import { TreatmentSession } from './entities/treatment-session.entity';
import { TreatmentController } from './treatment.controller';
import { TreatmentService } from './treatment.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([TreatmentCourse, TreatmentSession]), AuthModule],
  controllers: [TreatmentController],
  providers: [TreatmentService, RolesGuard],
  exports: [TreatmentService],
})
export class TreatmentModule {}
