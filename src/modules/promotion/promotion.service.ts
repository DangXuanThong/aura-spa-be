import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { DiscountCode } from './entities/discount-code.entity';
import { LoyaltyAccount } from 'src/modules/loyalty/entities/loyalty-account.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { CreateDiscountCodeDto } from './dto/create-discount-code.dto';
import { UpdateDiscountCodeDto } from './dto/update-discount-code.dto';
import { PromotionStatus } from './enums/promotion-status.enum';
import { DiscountType } from './enums/discount-type.enum';
import { DiscountCodeStatus } from './enums/discount-code-status.enum';

const CUSTOMER_TIER_ORDER = ['Aura Member', 'Aura Gold', 'Aura Platinum'];

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly repo: Repository<Promotion>,
    @InjectRepository(DiscountCode)
    private readonly codeRepo: Repository<DiscountCode>,
    @InjectRepository(LoyaltyAccount)
    private readonly loyaltyAccountRepo: Repository<LoyaltyAccount>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    if (dto.discountType === DiscountType.Percentage && dto.discountValue > 100) {
      throw new BadRequestException('Percentage discount value must be between 0 and 100');
    }

    const existing = await this.repo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Promotion code "${dto.code}" already exists`);
    }

    const promotion = this.repo.create(dto);
    try {
      return await this.repo.save(promotion);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException(`Promotion code "${dto.code}" already exists`);
      }
      throw err;
    }
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

    return query.orderBy('p.startsAt', 'ASC').take(200).getMany();
  }

  async findEligibleCodesForCustomer(customerId: string, branchId?: string): Promise<any[]> {
    const now = new Date();
    const account = await this.loyaltyAccountRepo.findOne({ where: { customerId } });
    const customerTier = account?.tier ?? 'Aura Member';
    const pointsBalance = account?.pointsBalance ?? 0;
    const previousBookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.customerId = :customerId', { customerId })
      .andWhere('booking.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [BookingStatus.Cancelled, BookingStatus.Rescheduled],
      })
      .getCount();

    const codes = await this.codeRepo
      .createQueryBuilder('dc')
      .innerJoinAndSelect('dc.promotion', 'p')
      .where('dc.status = :codeStatus', { codeStatus: DiscountCodeStatus.Active })
      .andWhere('p.status = :promotionStatus', { promotionStatus: PromotionStatus.Active })
      .andWhere('p.startsAt <= :now', { now })
      .andWhere('p.endsAt >= :now', { now })
      .andWhere(branchId ? '(p.branchId IS NULL OR p.branchId = :branchId)' : '1=1', { branchId })
      .orderBy('p.startsAt', 'ASC')
      .take(100)
      .getMany();

    return codes
      .filter((code) => this.isEligibleForPromotion(code.promotion!, customerTier, pointsBalance, previousBookings))
      .map((code) => {
        const promotion = code.promotion!;
        return {
          id: code.id,
          code: code.code,
          promotionId: promotion.id,
          promotionName: promotion.name,
          description: promotion.description,
          branchId: promotion.branchId,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
          maxDiscountAmount: promotion.maxDiscountAmount,
          minOrderAmount: promotion.minOrderAmount,
          eligibleCustomerTier: promotion.eligibleCustomerTier,
          minPointsBalance: promotion.minPointsBalance,
          firstBookingOnly: promotion.firstBookingOnly,
          endsAt: promotion.endsAt,
        };
      });
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

    const effectiveType = dto.discountType ?? promotion.discountType;
    const effectiveValue = dto.discountValue ?? promotion.discountValue;
    if (effectiveType === DiscountType.Percentage && effectiveValue > 100) {
      throw new BadRequestException('Percentage discount value must be between 0 and 100');
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
    return query.orderBy('p.startsAt', 'ASC').take(200).getMany();
  }

  // UC35 — Owner: list discount codes for a promotion
  async listDiscountCodes(promotionId: string): Promise<DiscountCode[]> {
    await this.findOne(promotionId);
    return this.codeRepo.find({
      where: { promotionId },
      order: { createdAt: 'ASC' },
      take: 500,
    });
  }

  // UC35 — Owner: create a discount code under a promotion
  async createDiscountCode(promotionId: string, dto: CreateDiscountCodeDto): Promise<DiscountCode> {
    await this.findOne(promotionId);

    const existing = await this.codeRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Discount code "${dto.code}" already exists`);

    const entity = this.codeRepo.create({ ...dto, promotionId });
    try {
      return await this.codeRepo.save(entity);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException(`Discount code "${dto.code}" already exists`);
      }
      throw err;
    }
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

  private isEligibleForPromotion(promotion: Promotion, customerTier: string, pointsBalance: number, previousBookings: number): boolean {
    if (promotion.eligibleCustomerTier && !this.isTierAtLeast(customerTier, promotion.eligibleCustomerTier)) return false;
    if (promotion.minPointsBalance !== null && promotion.minPointsBalance !== undefined && pointsBalance < promotion.minPointsBalance) return false;
    if (promotion.firstBookingOnly && previousBookings > 0) return false;
    return true;
  }

  private isTierAtLeast(customerTier: string, requiredTier: string): boolean {
    const customerRank = CUSTOMER_TIER_ORDER.indexOf(customerTier);
    const requiredRank = CUSTOMER_TIER_ORDER.indexOf(requiredTier);
    if (requiredRank === -1) return true;
    if (customerRank === -1) return false;
    return customerRank >= requiredRank;
  }
}
