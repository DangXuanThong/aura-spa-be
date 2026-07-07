import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNotificationEnabled1782100000000 implements MigrationInterface {
  name = 'AddUserNotificationEnabled1782100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "notification_enabled" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notification_enabled"`);
  }
}
