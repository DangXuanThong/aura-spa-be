import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromotionEligibilityRules1783200000000 implements MigrationInterface {
  name = 'AddPromotionEligibilityRules1783200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "promotions" ADD "eligible_customer_tier" character varying(50)`);
    await queryRunner.query(`ALTER TABLE "promotions" ADD "min_points_balance" integer`);
    await queryRunner.query(`ALTER TABLE "promotions" ADD "first_booking_only" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "promotions" DROP COLUMN "first_booking_only"`);
    await queryRunner.query(`ALTER TABLE "promotions" DROP COLUMN "min_points_balance"`);
    await queryRunner.query(`ALTER TABLE "promotions" DROP COLUMN "eligible_customer_tier"`);
  }
}
