import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { BranchServiceService } from './branch-service.service';
import { CreateBranchServiceDto } from './dto/create-branch-service.dto';
import { UpdateBranchServiceDto } from './dto/update-branch-service.dto';
import { BranchServiceResponseDto } from './dto/branch-service-response.dto';

@ApiTags('Branch Services')
@ApiBearerAuth('access-token')
@Controller('branch-services')
export class BranchServiceController {
  constructor(private readonly branchServiceService: BranchServiceService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Branch-Service created successfully', type: BranchServiceResponseDto })
  async create(@Body() createBranchServiceDto: CreateBranchServiceDto): Promise<BranchServiceResponseDto> {
    const result = await this.branchServiceService.create(createBranchServiceDto);
    return plainToInstance(BranchServiceResponseDto, result);
  }

  @Get()
  @ApiOkResponse({ description: 'List of branch-services', type: [BranchServiceResponseDto] })
  async findAll(@Query('branchId') branchId?: string, @Query('serviceId') serviceId?: string): Promise<BranchServiceResponseDto[]> {
    const results = await this.branchServiceService.findAll(branchId, serviceId);
    return plainToInstance(BranchServiceResponseDto, results);
  }

  @Get('branch/:branchId')
  @ApiOkResponse({ description: 'Services for a specific branch', type: [BranchServiceResponseDto] })
  async getServicesByBranch(@Param('branchId') branchId: string): Promise<BranchServiceResponseDto[]> {
    const results = await this.branchServiceService.getServicesByBranch(branchId);
    return plainToInstance(BranchServiceResponseDto, results);
  }

  @Get('service/:serviceId')
  @ApiOkResponse({ description: 'Branches offering a specific service', type: [BranchServiceResponseDto] })
  async getBranchesByService(@Param('serviceId') serviceId: string): Promise<BranchServiceResponseDto[]> {
    const results = await this.branchServiceService.getBranchesByService(serviceId);
    return plainToInstance(BranchServiceResponseDto, results);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Branch-Service found', type: BranchServiceResponseDto })
  async findOne(@Param('id') id: string): Promise<BranchServiceResponseDto> {
    const result = await this.branchServiceService.findOne(id);
    return plainToInstance(BranchServiceResponseDto, result);
  }

  @Get('branch/:branchId/service/:serviceId')
  @ApiOkResponse({ description: 'Specific branch-service relationship', type: BranchServiceResponseDto })
  async findByBranchAndService(@Param('branchId') branchId: string, @Param('serviceId') serviceId: string): Promise<BranchServiceResponseDto> {
    const result = await this.branchServiceService.findByBranchAndService(branchId, serviceId);
    return plainToInstance(BranchServiceResponseDto, result);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Branch-Service updated successfully', type: BranchServiceResponseDto })
  async update(@Param('id') id: string, @Body() updateBranchServiceDto: UpdateBranchServiceDto): Promise<BranchServiceResponseDto> {
    const result = await this.branchServiceService.update(id, updateBranchServiceDto);
    return plainToInstance(BranchServiceResponseDto, result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.branchServiceService.remove(id);
  }

  @Delete('branch/:branchId/service/:serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeByBranchAndService(@Param('branchId') branchId: string, @Param('serviceId') serviceId: string): Promise<void> {
    return this.branchServiceService.removeByBranchAndService(branchId, serviceId);
  }
}
