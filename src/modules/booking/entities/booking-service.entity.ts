import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Booking } from './booking.entity';
import { Service } from 'src/modules/service/entities/service.entity';

@Entity('booking_services')
@Index('IDX_booking_services_booking_id', ['bookingId'])
@Index('IDX_booking_services_service_id', ['serviceId'])
export class BookingService {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'booking_id', type: 'bigint', nullable: false })
  bookingId!: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ name: 'service_id', type: 'bigint', nullable: false })
  serviceId!: string;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service?: Service;

  @Column({ type: 'int', default: 1, nullable: false })
  quantity!: number;

  @Column({ name: 'duration_minutes', type: 'int', nullable: false })
  durationMinutes!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  unitPrice!: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  discountAmount!: number;

  @Column({ name: 'final_amount', type: 'decimal', precision: 10, scale: 2, nullable: false })
  finalAmount!: number;
}
