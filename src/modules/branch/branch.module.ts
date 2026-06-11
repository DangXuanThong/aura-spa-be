import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchController } from './branch.controller';
import { Branch } from './entities/branch.entity';
import { BranchService } from './branch.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch]),
    AuthModule, // ← provides JwtStrategy + PassportModule for JwtAuthGuard
  ],
  controllers: [BranchController],
  providers: [BranchService, RolesGuard],
  exports: [BranchService],
})
export class BranchModule {}
