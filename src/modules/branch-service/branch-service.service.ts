import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBranchServiceDto } from './dto/create-branch-service.dto';
import { UpdateBranchServiceDto } from './dto/update-branch-service.dto';
import { BranchService } from './entities/branch-service.entity';
import { Branch } from '../branch/entities/branch.entity';
import { Service } from '../service/entities/service.entity';

@Injectable()
export class BranchServiceService {
  constructor(
    @InjectRepository(BranchService)
    private readonly branchServiceRepository: Repository<BranchService>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async create(createBranchServiceDto: CreateBranchServiceDto): Promise<BranchService> {
    // Validate branch exists
    const branch = await this.branchRepository.findOne({ where: { id: createBranchServiceDto.branchId } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${createBranchServiceDto.branchId} not found`);
    }

    // Validate service exists
    const service = await this.serviceRepository.findOne({ where: { id: createBranchServiceDto.serviceId } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${createBranchServiceDto.serviceId} not found`);
    }

    // Check if relationship already exists
    const existing = await this.branchServiceRepository.findOne({
      where: { branchId: createBranchServiceDto.branchId, serviceId: createBranchServiceDto.serviceId },
    });

    if (existing) {
      throw new BadRequestException('This service is already assigned to this branch');
    }

    const branchService = this.branchServiceRepository.create(createBranchServiceDto);
    return this.branchServiceRepository.save(branchService);
  }

  async findAll(branchId?: string, serviceId?: string): Promise<BranchService[]> {
    const query = this.branchServiceRepository.createQueryBuilder('bs');

    if (branchId) {
      query.where('bs.branchId = :branchId', { branchId });
    }

    if (serviceId) {
      query.andWhere('bs.serviceId = :serviceId', { serviceId });
    }

    return query.orderBy('bs.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<BranchService> {
    const branchService = await this.branchServiceRepository.findOne({ where: { id } });

    if (!branchService) {
      throw new NotFoundException(`Branch-Service with ID ${id} not found`);
    }

    return branchService;
  }

  async findByBranchAndService(branchId: string, serviceId: string): Promise<BranchService> {
    const branchService = await this.branchServiceRepository.findOne({
      where: { branchId, serviceId },
    });

    if (!branchService) {
      throw new NotFoundException(`Service ${serviceId} not found for branch ${branchId}`);
    }

    return branchService;
  }

  async getServicesByBranch(branchId: string): Promise<BranchService[]> {
    // Verify branch exists
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    return this.branchServiceRepository.find({
      where: { branchId, isEnabled: true },
      relations: ['service'],
      order: { createdAt: 'DESC' },
    });
  }

  async getEnabledServicesWithDetailsByBranch(branchId: string): Promise<BranchService[]> {
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    return this.branchServiceRepository.find({
      where: { branchId, isEnabled: true },
      relations: ['service'],
      order: { service: { category: 'ASC', name: 'ASC' } },
    });
  }

  async getBranchesByService(serviceId: string): Promise<BranchService[]> {
    // Verify service exists
    const service = await this.serviceRepository.findOne({ where: { id: serviceId } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    return this.branchServiceRepository.find({
      where: { serviceId, isEnabled: true },
      relations: ['branch'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateBranchServiceDto: UpdateBranchServiceDto): Promise<BranchService> {
    const branchService = await this.findOne(id);

    // If changing service, verify new service exists and no duplicate
    if ((updateBranchServiceDto as any).serviceId && (updateBranchServiceDto as any).serviceId !== branchService.serviceId) {
      const service = await this.serviceRepository.findOne({ where: { id: (updateBranchServiceDto as any).serviceId } });
      if (!service) {
        throw new NotFoundException(`Service with ID ${(updateBranchServiceDto as any).serviceId} not found`);
      }

      const existing = await this.branchServiceRepository.findOne({
        where: { branchId: branchService.branchId, serviceId: (updateBranchServiceDto as any).serviceId },
      });

      if (existing) {
        throw new BadRequestException('This service is already assigned to this branch');
      }
    }

    Object.assign(branchService, updateBranchServiceDto);
    return this.branchServiceRepository.save(branchService);
  }

  async remove(id: string): Promise<void> {
    const branchService = await this.findOne(id);
    await this.branchServiceRepository.remove(branchService);
  }

  async removeByBranchAndService(branchId: string, serviceId: string): Promise<void> {
    const branchService = await this.findByBranchAndService(branchId, serviceId);
    await this.branchServiceRepository.remove(branchService);
  }

  async countByBranch(branchId: string): Promise<number> {
    return this.branchServiceRepository.count({ where: { branchId } });
  }

  async countEnabledByBranch(branchId: string): Promise<number> {
    return this.branchServiceRepository.count({ where: { branchId, isEnabled: true } });
  }
}
