import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { DiscountCode } from './entities/discount-code.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { CreateDiscountCodeDto } from './dto/create-discount-code.dto';
import { UpdateDiscountCodeDto } from './dto/update-discount-code.dto';
import { PromotionStatus } from './enums/promotion-status.enum';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly repo: Repository<Promotion>,
    @InjectRepository(DiscountCode)
    private readonly codeRepo: Repository<DiscountCode>,
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

  // UC35 — Owner: find all promotions (all statuses)
  async findAllForOwner(status?: PromotionStatus): Promise<Promotion[]> {
    const query = this.repo.createQueryBuilder('p');
    if (status) query.where('p.status = :status', { status });
    return query.orderBy('p.startsAt', 'ASC').getMany();
  }

  // UC35 — Owner: list discount codes for a promotion
  async listDiscountCodes(promotionId: string): Promise<DiscountCode[]> {
    await this.findOne(promotionId);
    return this.codeRepo.find({
      where: { promotionId },
      order: { createdAt: 'ASC' },
    });
  }

  // UC35 — Owner: create a discount code under a promotion
  async createDiscountCode(promotionId: string, dto: CreateDiscountCodeDto): Promise<DiscountCode> {
    await this.findOne(promotionId);

    const existing = await this.codeRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Discount code "${dto.code}" already exists`);

    const entity = this.codeRepo.create({ ...dto, promotionId });
    return this.codeRepo.save(entity);
  }

  // UC35 — Owner: update a discount code
  async updateDiscountCode(promotionId: string, codeId: string, dto: UpdateDiscountCodeDto): Promise<DiscountCode> {
    await this.findOne(promotionId);
    const discountCode = await this.loadDiscountCode(promotionId, codeId);

    if (dto.code && dto.code !== discountCode.code) {
      const existing = await this.codeRepo.findOne({ where: { code: dto.code } });
      if (existing) throw new ConflictException(`Discount code "${dto.code}" already exists`);
    }

    Object.assign(discountCode, dto);
    return this.codeRepo.save(discountCode);
  }

  // UC35 — Owner: remove a discount code
  async removeDiscountCode(promotionId: string, codeId: string): Promise<void> {
    await this.findOne(promotionId);
    const discountCode = await this.loadDiscountCode(promotionId, codeId);
    await this.codeRepo.remove(discountCode);
  }

  private async loadDiscountCode(promotionId: string, codeId: string): Promise<DiscountCode> {
    const discountCode = await this.codeRepo.findOne({ where: { id: codeId, promotionId } });
    if (!discountCode) throw new NotFoundException(`Discount code ${codeId} not found for this promotion`);
    return discountCode;
  }
}
