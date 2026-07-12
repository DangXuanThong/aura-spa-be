import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { TreatmentCourse } from './treatment-course.entity';
import { TreatmentSessionStatus } from '../enums/treatment-session-status.enum';

@Entity('treatment_sessions')
@Index('IDX_treatment_sessions_course_number', ['treatmentCourseId', 'sessionNumber'], { unique: true })
@Index('IDX_treatment_sessions_course_id', ['treatmentCourseId'])
@Index('IDX_treatment_sessions_booking_id', ['bookingId'])
@Index('IDX_treatment_sessions_staff_id', ['staffId'])
export class TreatmentSession {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'treatment_course_id', type: 'bigint', nullable: false })
  treatmentCourseId!: string;

  @ManyToOne(() => TreatmentCourse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'treatment_course_id' })
  treatmentCourse?: TreatmentCourse;

  @Column({ name: 'booking_id', type: 'bigint', nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ name: 'service_id', type: 'bigint', nullable: false })
  serviceId!: string;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service?: Service;

  @Column({ name: 'session_number', type: 'int', nullable: false })
  sessionNumber!: number;

  @Column({
    type: 'enum',
    enum: TreatmentSessionStatus,
    enumName: 'treatment_session_status',
    default: TreatmentSessionStatus.Planned,
    nullable: false,
  })
  status!: TreatmentSessionStatus;

  @Column({ name: 'staff_id', type: 'bigint', nullable: true })
  staffId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff?: User;

  @Column({ name: 'progress_note', type: 'text', nullable: true })
  progressNote!: string | null;

  @Column({ name: 'care_recommendation', type: 'text', nullable: true })
  careRecommendation!: string | null;

  @Column({ name: 'next_recommended_at', type: 'timestamptz', nullable: true })
  nextRecommendedAt!: Date | null;

  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt!: Date | null;

  @Column({ name: 'before_images', type: 'jsonb', nullable: true })
  beforeImages!: string[] | null;

  @Column({ name: 'after_images', type: 'jsonb', nullable: true })
  afterImages!: string[] | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
