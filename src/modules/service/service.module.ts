import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service]),
    AuthModule, // ← provides JwtStrategy + PassportModule for JwtAuthGuard
  ],
  controllers: [ServiceController],
  providers: [ServiceService, RolesGuard],
  exports: [ServiceService],
})
export class ServiceModule {}
