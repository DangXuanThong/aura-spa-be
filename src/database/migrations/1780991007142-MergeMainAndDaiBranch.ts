import { MigrationInterface, QueryRunner } from "typeorm";

export class MergeMainAndDaiBranch1780991007142 implements MigrationInterface {
    name = 'MergeMainAndDaiBranch1780991007142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "FK_branch_services_branch_id"`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "FK_branch_services_service_id"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "branchId" uuid`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD "serviceId" uuid`);
        await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "code" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "city" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "FK_0d09eb026d1cafd3e5177d8deba" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "FK_162b14b5d05c0698b6a12c6fff6" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "FK_162b14b5d05c0698b6a12c6fff6"`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP CONSTRAINT "FK_0d09eb026d1cafd3e5177d8deba"`);
        await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "city" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "code" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "serviceId"`);
        await queryRunner.query(`ALTER TABLE "branch_services" DROP COLUMN "branchId"`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "FK_branch_services_service_id" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "branch_services" ADD CONSTRAINT "FK_branch_services_branch_id" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
