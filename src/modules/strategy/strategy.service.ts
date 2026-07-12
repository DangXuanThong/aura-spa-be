import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy, StrategySource } from './entities/strategy.entity';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

@Injectable()
export class StrategyService {
  constructor(
    @InjectRepository(Strategy)
    private readonly repo: Repository<Strategy>,
  ) {}

  findAll(): Promise<Strategy[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  async findOne(id: string): Promise<Strategy> {
    const strategy = await this.repo.findOne({ where: { id } });
    if (!strategy) throw new NotFoundException('Strategy not found');
    return strategy;
  }

  create(dto: CreateStrategyDto, userId: string): Promise<Strategy> {
    return this.repo.save(
      this.repo.create({
        title: dto.title,
        description: dto.description,
        badge: dto.badge,
        priority: dto.priority,
        status: dto.status,
        source: StrategySource.Manual,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
  }

  createAi(
    dto: CreateStrategyDto & {
      aiConfidence: number;
      supportingData: Record<string, unknown>;
    },
    userId: string,
  ): Promise<Strategy> {
    return this.repo.save(
      this.repo.create({
        title: dto.title,
        description: dto.description,
        badge: dto.badge,
        priority: dto.priority,
        status: dto.status,
        source: StrategySource.AiGenerated,
        aiConfidence: dto.aiConfidence,
        supportingData: dto.supportingData,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
  }

  async update(id: string, dto: UpdateStrategyDto, userId: string): Promise<Strategy> {
    await this.findOne(id);
    await this.repo.update(id, { ...dto, updatedBy: userId });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
