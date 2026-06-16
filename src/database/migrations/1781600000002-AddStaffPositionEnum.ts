import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffPositionEnum1781600000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."staff_position" AS ENUM ('technician', 'receptionist', 'manager')
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_staff"
        ALTER COLUMN "position" TYPE "public"."staff_position"
        USING "position"::"public"."staff_position"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "branch_staff"
        ALTER COLUMN "position" TYPE varchar(100)
        USING "position"::varchar
    `);
    await queryRunner.query(`DROP TYPE "public"."staff_position"`);
  }
}