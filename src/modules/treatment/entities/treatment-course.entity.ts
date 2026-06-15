import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { Invoice } from 'src/modules/payment/entities/invoice.entity';
import { TreatmentCourseStatus } from '../enums/treatment-course-status.enum';

@Entity('treatment_courses')
@Index('IDX_treatment_courses_customer_status', ['customerId', 'status'])
@Index('IDX_treatment_courses_service_id', ['serviceId'])
@Index('IDX_treatment_courses_branch_id', ['branchId'])
@Index('IDX_treatment_courses_expires_at', ['expiresAt'])
export class TreatmentCourse {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'customer_id', type: 'bigint', nullable: false })
  customerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  customer?: User;

  @Column({ name: 'service_id', type: 'bigint', nullable: false })
  serviceId!: string;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  service?: Service;

  @Column({ name: 'branch_id', type: 'bigint', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  branch?: Branch;

  @Column({ name: 'purchase_invoice_id', type: 'bigint', nullable: true })
  purchaseInvoiceId!: string | null;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  purchaseInvoice?: Invoice;

  @Column({ name: 'total_sessions', type: 'int', nullable: false })
  totalSessions!: number;

  @Column({ name: 'used_sessions', type: 'int', default: 0, nullable: false })
  usedSessions!: number;

  @Column({ name: 'remaining_sessions', type: 'int', nullable: false })
  remainingSessions!: number;

  @Column({
    type: 'enum',
    enum: TreatmentCourseStatus,
    enumName: 'treatment_course_status',
    default: TreatmentCourseStatus.Active,
    nullable: false,
  })
  status!: TreatmentCourseStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
