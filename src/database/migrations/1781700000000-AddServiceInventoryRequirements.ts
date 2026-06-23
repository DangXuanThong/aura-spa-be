import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceInventoryRequirements1781700000000 implements MigrationInterface {
  name = 'AddServiceInventoryRequirements1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "service_inventory_requirements" ("id" BIGSERIAL NOT NULL, "service_id" bigint NOT NULL, "inventory_item_id" bigint NOT NULL, "quantity_per_service" numeric(10,3) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_service_inventory_requirements" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_service_inventory_requirements_service_item" ON "service_inventory_requirements" ("service_id", "inventory_item_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_service_inventory_requirements_service_id" ON "service_inventory_requirements" ("service_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_service_inventory_requirements_item_id" ON "service_inventory_requirements" ("inventory_item_id")`);
    await queryRunner.query(
      `ALTER TABLE "service_inventory_requirements" ADD CONSTRAINT "FK_service_inventory_requirements_service" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_inventory_requirements" ADD CONSTRAINT "FK_service_inventory_requirements_item" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service_inventory_requirements" DROP CONSTRAINT "FK_service_inventory_requirements_item"`);
    await queryRunner.query(`ALTER TABLE "service_inventory_requirements" DROP CONSTRAINT "FK_service_inventory_requirements_service"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_service_inventory_requirements_item_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_service_inventory_requirements_service_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_service_inventory_requirements_service_item"`);
    await queryRunner.query(`DROP TABLE "service_inventory_requirements"`);
  }
}
