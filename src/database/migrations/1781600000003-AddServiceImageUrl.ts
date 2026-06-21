import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceImageUrl1781600000003 implements MigrationInterface {
  name = 'AddServiceImageUrl1781600000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "services" ADD "image_url" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "image_url"`);
  }
}
