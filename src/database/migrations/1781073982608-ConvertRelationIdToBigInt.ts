import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertRelationIdToBigInt1781073982608 implements MigrationInterface {
    name = 'ConvertRelationIdToBigInt1781073982608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_branch_services_branch_service"`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "branch_id"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "branch_id" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "service_id"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "service_id" bigint NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_branch_services_branch_service" ON "branch_services" ("branch_id", "service_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_branch_services_branch_service"`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "service_id"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "service_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "branch_id"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "branch_id" uuid NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_branch_services_branch_service" ON "branch_services" ("branch_id", "service_id") `);
    }

}
