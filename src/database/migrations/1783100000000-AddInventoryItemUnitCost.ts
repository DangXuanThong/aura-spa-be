import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryItemUnitCost1783100000000 implements MigrationInterface {
  name = 'AddInventoryItemUnitCost1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD "unit_cost" numeric(14,2) NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN "unit_cost"`);
  }
}
