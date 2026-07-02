import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchStaff } from './entities/branch-staff.entity';
import { Branch } from './entities/branch.entity';
import { BranchStatus } from './enums/branch-status.enum';
import { StaffPosition } from './enums/staff-position.enum';
import { StaffStatus } from './enums/staff-status.enum';

@Injectable()
export class BranchService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepository: Repository<BranchStaff>,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const existingBranch = await this.branchRepository.findOne({
      where: [{ code: createBranchDto.code }, { name: createBranchDto.name }],
    });

    if (existingBranch) {
      throw new BadRequestException('Branch code or name already exists');
    }

    const branch = this.branchRepository.create(createBranchDto);
    return this.branchRepository.save(branch);
  }

  async findAll(status?: BranchStatus, search?: string, includeAll = false): Promise<Branch[]> {
    const query = this.branchRepository.createQueryBuilder('branch');

    if (includeAll) {
      if (status) query.where('branch.status = :status', { status });
    } else {
      query.where('branch.status = :status', { status: status ?? BranchStatus.Active });
    }

    if (search) {
      query.andWhere('branch.name ILIKE :search', { search: `%${search}%` });
    }

    return query.orderBy('branch.name', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return branch;
  }

  async findByCode(code: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({ where: { code } });

    if (!branch) {
      throw new NotFoundException(`Branch with code ${code} not found`);
    }

    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);

    if (updateBranchDto.code || updateBranchDto.name) {
      const existingBranches = await this.branchRepository.find({
        where: [{ code: updateBranchDto.code ?? branch.code }, { name: updateBranchDto.name ?? branch.name }],
      });

      const otherBranch = existingBranches.find((b: Branch) => b.id !== id);
      if (otherBranch) {
        throw new BadRequestException('Branch code or name already exists');
      }
    }

    Object.assign(branch, updateBranchDto);
    return this.branchRepository.save(branch);
  }

  async remove(id: string): Promise<void> {
    const branch = await this.findOne(id);
    try {
      await this.branchRepository.remove(branch);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23503') {
        throw new ConflictException('Cannot delete branch: it has related records (staff, bookings, etc.). Deactivate it instead.');
      }
      throw err;
    }
  }

  async countActiveBranches(): Promise<number> {
    return this.branchRepository.count({ where: { status: BranchStatus.Active } });
  }

  async getByCity(city: string): Promise<Branch[]> {
    return this.branchRepository.find({
      where: { city, status: BranchStatus.Active },
      order: { name: 'ASC' },
    });
  }

  async getNearby(latitude: number, longitude: number, radiusKm: number = 50): Promise<Branch[]> {
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new BadRequestException('latitude must be a number between -90 and 90');
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('longitude must be a number between -180 and 180');
    }
    if (isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 500) {
      throw new BadRequestException('radius must be a positive number up to 500 km');
    }

    const radiusRadians = radiusKm / 6371; // Earth radius in km

    return this.branchRepository.query(
      `
      SELECT * FROM branches 
      WHERE status = $1 
      AND (
        acos(
          sin(radians($2)) * sin(radians(latitude)) +
          cos(radians($2)) * cos(radians(latitude)) * cos(radians($3 - longitude))
        ) * 6371
      ) <= $4
      ORDER BY name ASC
      `,
      [BranchStatus.Active, latitude, longitude, radiusKm],
    );
  }

  async findActiveTechnicians(branchId: string): Promise<BranchStaff[]> {
    await this.findOne(branchId);

    return this.branchStaffRepository.find({
      where: {
        branchId,
        position: StaffPosition.Technician,
        status: StaffStatus.Active,
      },
      relations: ['user'],
      order: { staffCode: 'ASC' },
    });
  }
}
