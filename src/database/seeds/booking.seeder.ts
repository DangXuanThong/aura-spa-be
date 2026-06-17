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
import { DEMO_BOOKINGS, UPCOMING_BOOKINGS, RESCHEDULED_PAIR, CANCELLED_BOOKING, TRANSFERRED_PAIR } from './seed-data';

const ALL_EMAILS = [
  'lan.nguyen@gmail.com',
  'minh.tran@gmail.com',
  'hoa.le@gmail.com',
  'bao.pham@gmail.com',
  'mai.hoang@gmail.com',
  'thu.vo@aura-spa.com',
  'duc.nguyen@aura-spa.com',
  'bich.tran@aura-spa.com',
];

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

    const users = await this.userRepo.find({ where: { email: In(ALL_EMAILS) } });
    const userMap = new Map(users.map((u) => [u.email, u]));

    const services = await this.serviceRepo.find();
    const serviceMap = new Map(services.map((s) => [s.code, s]));

    let seeded = 0;

    // ── Completed bookings (historical) ────────────────────────────────────
    for (const def of DEMO_BOOKINGS) {
      const customer = userMap.get(def.customerEmail);
      const branch = branchMap.get(def.branchCode);
      const technician = userMap.get(def.technicianEmail);
      const service = serviceMap.get(def.serviceCode);
      if (!customer || !branch || !technician || !service) continue;

      const booking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: customer.id,
          branchId: branch.id,
          technicianId: technician.id,
          startTime: def.startTime,
          endTime: def.endTime,
          status: BookingStatus.Completed,
          source: BookingSource.Online,
          subtotalAmount: def.price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: def.price,
          remainingAmount: 0,
          createdBy: customer.id,
          checkedInAt: def.startTime,
          completedAt: def.endTime,
        }),
      );
      await this.saveBookingService(booking.id, service.id, def.durationMinutes, def.price);
      seeded++;
    }

    // ── Upcoming confirmed bookings (UC10) ─────────────────────────────────
    for (const def of UPCOMING_BOOKINGS) {
      const customer = userMap.get(def.customerEmail);
      const branch = branchMap.get(def.branchCode);
      const technician = userMap.get(def.technicianEmail);
      const service = serviceMap.get(def.serviceCode);
      if (!customer || !branch || !technician || !service) continue;

      const endTime = new Date(def.startTime.getTime() + def.durationMinutes * 60 * 1000);
      const booking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: customer.id,
          branchId: branch.id,
          technicianId: technician.id,
          startTime: def.startTime,
          endTime,
          status: BookingStatus.Confirmed,
          source: BookingSource.Online,
          subtotalAmount: def.price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: 0,
          remainingAmount: def.price,
          createdBy: customer.id,
        }),
      );
      await this.saveBookingService(booking.id, service.id, def.durationMinutes, def.price);
      seeded++;
    }

    // ── Rescheduled pair (UC11) ────────────────────────────────────────────
    const rOrig = RESCHEDULED_PAIR.original;
    const rNew = RESCHEDULED_PAIR.rescheduled;
    const rCustomer = userMap.get(rOrig.customerEmail);
    const rBranch = branchMap.get(rOrig.branchCode);
    const rTechnician = userMap.get(rOrig.technicianEmail);
    const rService = serviceMap.get(rOrig.serviceCode);
    if (rCustomer && rBranch && rTechnician && rService) {
      const origEndTime = new Date(rOrig.startTime.getTime() + rOrig.durationMinutes * 60 * 1000);
      const origBooking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: rCustomer.id,
          branchId: rBranch.id,
          technicianId: rTechnician.id,
          startTime: rOrig.startTime,
          endTime: origEndTime,
          status: rOrig.status,
          source: BookingSource.Online,
          subtotalAmount: rOrig.price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: 0,
          remainingAmount: rOrig.price,
          createdBy: rCustomer.id,
        }),
      );
      await this.saveBookingService(origBooking.id, rService.id, rOrig.durationMinutes, rOrig.price);
      seeded++;

      const newEndTime = new Date(rNew.startTime.getTime() + rNew.durationMinutes * 60 * 1000);
      const newBooking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: rCustomer.id,
          branchId: rBranch.id,
          technicianId: rTechnician.id,
          startTime: rNew.startTime,
          endTime: newEndTime,
          status: rNew.status,
          source: BookingSource.Online,
          subtotalAmount: rNew.price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: 0,
          remainingAmount: rNew.price,
          rescheduledFromBookingId: origBooking.id,
          createdBy: rCustomer.id,
        }),
      );
      await this.saveBookingService(newBooking.id, rService.id, rNew.durationMinutes, rNew.price);
      seeded++;
    }

    // ── Cancelled booking (UC12) ───────────────────────────────────────────
    const cDef = CANCELLED_BOOKING;
    const cCustomer = userMap.get(cDef.customerEmail);
    const cBranch = branchMap.get(cDef.branchCode);
    const cService = serviceMap.get(cDef.serviceCode);
    if (cCustomer && cBranch && cService) {
      const cEndTime = new Date(cDef.startTime.getTime() + cDef.durationMinutes * 60 * 1000);
      const cBooking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: cCustomer.id,
          branchId: cBranch.id,
          technicianId: null,
          startTime: cDef.startTime,
          endTime: cEndTime,
          status: cDef.status,
          source: BookingSource.Online,
          subtotalAmount: cDef.price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: 0,
          remainingAmount: cDef.price,
          cancelReason: cDef.cancelReason,
          cancelledAt: cDef.cancelledAt,
          createdBy: cCustomer.id,
        }),
      );
      await this.saveBookingService(cBooking.id, cService.id, cDef.durationMinutes, cDef.price);
      seeded++;
    }

    // ── Transferred pair (UC13) ────────────────────────────────────────────
    const tOrig = TRANSFERRED_PAIR.original;
    const tNew = TRANSFERRED_PAIR.transferred;
    const tCustomer = userMap.get(tOrig.customerEmail);
    const tOrigBranch = branchMap.get(tOrig.branchCode);
    const tNewBranch = branchMap.get(tNew.branchCode);
    const tOrigTech = userMap.get(tOrig.technicianEmail);
    const tNewTech = userMap.get(tNew.technicianEmail);
    const tService = serviceMap.get(tOrig.serviceCode);
    if (tCustomer && tOrigBranch && tNewBranch && tOrigTech && tNewTech && tService) {
      const tOrigEnd = new Date(tOrig.startTime.getTime() + tOrig.durationMinutes * 60 * 1000);
      const tOrigBooking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: tCustomer.id,
          branchId: tOrigBranch.id,
          technicianId: tOrigTech.id,
          startTime: tOrig.startTime,
          endTime: tOrigEnd,
          status: tOrig.status,
          source: BookingSource.Online,
          subtotalAmount: tOrig.price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: 0,
          remainingAmount: tOrig.price,
          createdBy: tCustomer.id,
        }),
      );
      await this.saveBookingService(tOrigBooking.id, tService.id, tOrig.durationMinutes, tOrig.price);
      seeded++;

      const tNewEnd = new Date(tNew.startTime.getTime() + tNew.durationMinutes * 60 * 1000);
      const tNewBooking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: tCustomer.id,
          branchId: tNewBranch.id,
          technicianId: tNewTech.id,
          startTime: tNew.startTime,
          endTime: tNewEnd,
          status: tNew.status,
          source: BookingSource.Online,
          subtotalAmount: tNew.price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: 0,
          remainingAmount: tNew.price,
          transferredFromBranchId: tOrigBranch.id,
          createdBy: tCustomer.id,
        }),
      );
      await this.saveBookingService(tNewBooking.id, tService.id, tNew.durationMinutes, tNew.price);
      seeded++;
    }

    this.logger.log(`Seeded ${seeded} booking(s)`);
  }

  private async saveBookingService(bookingId: string, serviceId: string, durationMinutes: number, price: number): Promise<void> {
    await this.bookingServiceRepo.save(
      this.bookingServiceRepo.create({
        bookingId,
        serviceId,
        quantity: 1,
        durationMinutes,
        unitPrice: price,
        discountAmount: 0,
        finalAmount: price,
      }),
    );
  }
}
