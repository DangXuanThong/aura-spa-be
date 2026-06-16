import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { BookingSource } from 'src/modules/booking/enums/booking-source.enum';
import { DEMO_BOOKINGS } from './seed-data';

@Injectable()
export class BookingSeeder {
  private readonly logger = new Logger(BookingSeeder.name);

  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity) private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
  ) {}

  async seed(): Promise<void> {
    const count = await this.bookingRepo.count();
    if (count > 0) {
      this.logger.log('Bookings already exist — skipping');
      return;
    }

    const branches = await this.branchRepo.find();
    const branchMap = new Map(branches.map((b) => [b.code, b]));

    const customers = await this.userRepo.find({
      where: { email: In(['lan.nguyen@gmail.com', 'minh.tran@gmail.com', 'hoa.le@gmail.com']) },
    });
    const customerMap = new Map(customers.map((u) => [u.email, u]));

    const staff = await this.userRepo.find({
      where: { email: In(['thu.vo@aura-spa.com', 'duc.nguyen@aura-spa.com', 'bich.tran@aura-spa.com']) },
    });
    const staffMap = new Map(staff.map((u) => [u.email, u]));

    const services = await this.serviceRepo.find();
    const serviceMap = new Map(services.map((s) => [s.code, s]));

    let seeded = 0;
    for (const def of DEMO_BOOKINGS) {
      const customer = customerMap.get(def.customerEmail);
      const branch = branchMap.get(def.branchCode);
      const technician = staffMap.get(def.technicianEmail);
      const service = serviceMap.get(def.serviceCode);
      if (!customer || !branch || !technician || !service) continue;

      const booking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: customer.id,
          branchId: branch.id,
          technicianId: technician.id,
          discountCodeId: null,
          startTime: def.startTime,
          endTime: def.endTime,
          status: BookingStatus.Completed,
          source: BookingSource.Online,
          subtotalAmount: def.price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: def.price,
          remainingAmount: 0,
          notes: null,
          cancelReason: null,
          transferredFromBranchId: null,
          rescheduledFromBookingId: null,
          createdBy: customer.id,
          checkedInAt: def.startTime,
          completedAt: def.endTime,
          cancelledAt: null,
        }),
      );

      await this.bookingServiceRepo.save(
        this.bookingServiceRepo.create({
          bookingId: booking.id,
          serviceId: service.id,
          quantity: 1,
          durationMinutes: def.durationMinutes,
          unitPrice: def.price,
          discountAmount: 0,
          finalAmount: def.price,
        }),
      );

      seeded++;
    }

    this.logger.log(`Seeded ${seeded} booking(s)`);
  }
}
