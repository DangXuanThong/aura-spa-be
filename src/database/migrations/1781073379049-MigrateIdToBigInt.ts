import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateIdToBigInt1781073379049 implements MigrationInterface {
    name = 'MigrateIdToBigInt1781073379049'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "FK_0d09eb026d1cafd3e5177d8deba"`);
        await queryRunner.query(`ALTER TABLE "branches" DROP CONSTRAINT "branches_pkey"`);
        await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "branches" ADD "id" BIGSERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "branches" ADD CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "FK_162b14b5d05c0698b6a12c6fff6"`);
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "PK_services_id"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "services" ADD "id" BIGSERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "PK_branch_services_id"`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "id" BIGSERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "PK_8fc6b76c8682d0241a9baac878a" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "branchId"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "branchId" bigint`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "serviceId"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "serviceId" bigint`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "FK_0d09eb026d1cafd3e5177d8deba" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "FK_162b14b5d05c0698b6a12c6fff6" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "FK_162b14b5d05c0698b6a12c6fff6"`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "FK_0d09eb026d1cafd3e5177d8deba"`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "serviceId"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "serviceId" uuid`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "branchId"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "branchId" uuid`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "PK_8fc6b76c8682d0241a9baac878a"`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "PK_branch_services_id" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "services" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "PK_services_id" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "FK_162b14b5d05c0698b6a12c6fff6" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "branches" DROP CONSTRAINT "PK_7f37d3b42defea97f1df0d19535"`);
        await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "branches" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "branches" ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "FK_0d09eb026d1cafd3e5177d8deba" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
