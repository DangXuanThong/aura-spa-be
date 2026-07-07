import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLoginLockFields1782200000000 implements MigrationInterface {
  name = 'AddUserLoginLockFields1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "failed_login_count" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "users" ADD "login_lock_until" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "login_lock_until"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failed_login_count"`);
  }
}
