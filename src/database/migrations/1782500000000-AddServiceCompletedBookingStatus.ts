import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceCompletedBookingStatus1782500000000 implements MigrationInterface {
  name = 'AddServiceCompletedBookingStatus1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."booking_status"
      ADD VALUE IF NOT EXISTS 'service_completed'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."booking_status_old" AS ENUM(
        'pending_payment',
        'confirmed',
        'checked_in',
        'in_service',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled',
        'transferred'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" TYPE "public"."booking_status_old"
      USING (
        CASE
          WHEN "status"::text = 'service_completed' THEN 'in_service'
          ELSE "status"::text
        END
      )::"public"."booking_status_old"
    `);
    await queryRunner.query(`DROP TYPE "public"."booking_status"`);
    await queryRunner.query(`ALTER TYPE "public"."booking_status_old" RENAME TO "booking_status"`);
  }
}