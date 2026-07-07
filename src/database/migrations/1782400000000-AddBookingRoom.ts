import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingRoom1782400000000 implements MigrationInterface {
  name = 'AddBookingRoom1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "room" character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
      DROP COLUMN IF EXISTS "room"
    `);
  }
}
