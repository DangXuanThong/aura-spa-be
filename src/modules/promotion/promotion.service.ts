import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionStatus } from './enums/promotion-status.enum';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly repo: Repository<Promotion>,
  ) {}

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const existing = await this.repo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException(`Promotion code "${dto.code}" already exists`);
    }

    const promotion = this.repo.create(dto);
    return this.repo.save(promotion);
  }

  // UC07 — Guest View Promotions
  // No status: returns currently active promotions (status=Active, within date range)
  // With status: returns all matching that status (admin use)
  // branchId: narrows to system-wide (branchId IS NULL) + that branch
  async findAll(status?: PromotionStatus, branchId?: string): Promise<Promotion[]> {
    const now = new Date();
    const query = this.repo.createQueryBuilder('p');

    if (status) {
      query.where('p.status = :status', { status });
    } else {
      query
        .where('p.status = :status', { status: PromotionStatus.Active })
        .andWhere('p.startsAt <= :now', { now })
        .andWhere('p.endsAt >= :now', { now });
    }

    if (branchId) {
      query.andWhere('(p.branchId IS NULL OR p.branchId = :branchId)', { branchId });
    }

    return query.orderBy('p.startsAt', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Promotion> {
    const promotion = await this.repo.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }
    return promotion;
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.findOne(id);

    if (dto.code && dto.code !== promotion.code) {
      const existing = await this.repo.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new BadRequestException(`Promotion code "${dto.code}" already exists`);
      }
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : promotion.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : promotion.endsAt;
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    Object.assign(promotion, dto);
    return this.repo.save(promotion);
  }

  async remove(id: string): Promise<void> {
    const promotion = await this.findOne(id);
    await this.repo.remove(promotion);
  }
}
