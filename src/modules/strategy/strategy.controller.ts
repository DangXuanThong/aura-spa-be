import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { StrategyService } from './strategy.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import { buildSuccessResponse } from 'src/common/dto/api-response.dto';

@ApiTags('Strategies')
@ApiBearerAuth('access-token')
@Controller('strategies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Get()
  @Roles(UserRole.Owner, UserRole.Manager)
  async findAll() {
    const data = await this.strategyService.findAll();
    return buildSuccessResponse(data);
  }

  @Get(':id')
  @Roles(UserRole.Owner, UserRole.Manager)
  async findOne(@Param('id') id: string) {
    const data = await this.strategyService.findOne(id);
    return buildSuccessResponse(data);
  }

  @Post()
  @Roles(UserRole.Owner)
  async create(@Body() dto: CreateStrategyDto, @Request() req: any) {
    const data = await this.strategyService.create(dto, req.user.id);
    return buildSuccessResponse(data);
  }

  @Patch(':id')
  @Roles(UserRole.Owner)
  async update(@Param('id') id: string, @Body() dto: UpdateStrategyDto, @Request() req: any) {
    const data = await this.strategyService.update(id, dto, req.user.id);
    return buildSuccessResponse(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.Owner)
  async remove(@Param('id') id: string) {
    await this.strategyService.remove(id);
  }
}
