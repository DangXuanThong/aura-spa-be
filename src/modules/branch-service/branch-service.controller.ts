import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BranchServiceService } from './branch-service.service';
import { CreateBranchServiceDto } from './dto/create-branch-service.dto';
import { UpdateBranchServiceDto } from './dto/update-branch-service.dto';
import { BranchService } from './entities/branch-service.entity';

@ApiTags('Branch Services')
@ApiBearerAuth('access-token')
@Controller('branch-services')
export class BranchServiceController {
  constructor(private readonly branchServiceService: BranchServiceService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Branch-Service created successfully', type: BranchService })
  async create(@Body() createBranchServiceDto: CreateBranchServiceDto): Promise<BranchService> {
    return this.branchServiceService.create(createBranchServiceDto);
  }

  @Get()
  @ApiOkResponse({ description: 'List of branch-services', type: [BranchService] })
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('serviceId') serviceId?: string,
  ): Promise<BranchService[]> {
    return this.branchServiceService.findAll(branchId, serviceId);
  }

  @Get('branch/:branchId')
  @ApiOkResponse({ description: 'Services for a specific branch', type: [BranchService] })
  async getServicesByBranch(@Param('branchId') branchId: string): Promise<BranchService[]> {
    return this.branchServiceService.getServicesByBranch(branchId);
  }

  @Get('service/:serviceId')
  @ApiOkResponse({ description: 'Branches offering a specific service', type: [BranchService] })
  async getBranchesByService(@Param('serviceId') serviceId: string): Promise<BranchService[]> {
    return this.branchServiceService.getBranchesByService(serviceId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Branch-Service found', type: BranchService })
  async findOne(@Param('id') id: string): Promise<BranchService> {
    return this.branchServiceService.findOne(id);
  }

  @Get('branch/:branchId/service/:serviceId')
  @ApiOkResponse({ description: 'Specific branch-service relationship', type: BranchService })
  async findByBranchAndService(
    @Param('branchId') branchId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<BranchService> {
    return this.branchServiceService.findByBranchAndService(branchId, serviceId);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Branch-Service updated successfully', type: BranchService })
  async update(@Param('id') id: string, @Body() updateBranchServiceDto: UpdateBranchServiceDto): Promise<BranchService> {
    return this.branchServiceService.update(id, updateBranchServiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.branchServiceService.remove(id);
  }

  @Delete('branch/:branchId/service/:serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeByBranchAndService(
    @Param('branchId') branchId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<void> {
    return this.branchServiceService.removeByBranchAndService(branchId, serviceId);
  }
}
