import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';
import { ServiceStatus } from './enums/service-status.enum';

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const existingService = await this.serviceRepository.findOne({
      where: [{ code: createServiceDto.code }, { slug: createServiceDto.slug }],
    });

    if (existingService) {
      throw new BadRequestException('Service code or slug already exists');
    }

    const service = this.serviceRepository.create(createServiceDto);
    return this.serviceRepository.save(service);
  }

  async findAll(status?: ServiceStatus, includeAll = false): Promise<Service[]> {
    const query = this.serviceRepository.createQueryBuilder('service');

    if (includeAll) {
      if (status) query.where('service.status = :status', { status });
    } else {
      query.where('service.status = :status', { status: status ?? ServiceStatus.Active });
    }

    return query.orderBy('service.name', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async findByCode(code: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({ where: { code } });

    if (!service) {
      throw new NotFoundException(`Service with code ${code} not found`);
    }

    return service;
  }

  async findBySlug(slug: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({ where: { slug } });

    if (!service) {
      throw new NotFoundException(`Service with slug ${slug} not found`);
    }

    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOne(id);

    if (updateServiceDto.slug || updateServiceDto.code) {
      const existingServices = await this.serviceRepository.find({
        where: [{ slug: updateServiceDto.slug ?? service.slug }, { code: updateServiceDto.code ?? service.code }],
      });

      const otherService = existingServices.find((s) => s.id !== id);
      if (otherService) {
        throw new BadRequestException('Service code or slug already exists');
      }
    }

    Object.assign(service, updateServiceDto);
    return this.serviceRepository.save(service);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    await this.serviceRepository.remove(service);
  }

  async countByStatus(status: ServiceStatus): Promise<number> {
    return this.serviceRepository.count({ where: { status } });
  }

  async getServicesByCategory(category: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { category, status: ServiceStatus.Active },
      order: { name: 'ASC' },
    });
  }
}
