import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTreatmentSessionFollowUpFields1783300000000 implements MigrationInterface {
  name = 'AddTreatmentSessionFollowUpFields1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "treatment_sessions" ADD "care_recommendation" text`);
    await queryRunner.query(`ALTER TABLE "treatment_sessions" ADD "next_recommended_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "treatment_sessions" ADD "reminder_sent_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`CREATE INDEX "IDX_treatment_sessions_next_recommended_at" ON "treatment_sessions" ("next_recommended_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_treatment_sessions_next_recommended_at"`);
    await queryRunner.query(`ALTER TABLE "treatment_sessions" DROP COLUMN "reminder_sent_at"`);
    await queryRunner.query(`ALTER TABLE "treatment_sessions" DROP COLUMN "next_recommended_at"`);
    await queryRunner.query(`ALTER TABLE "treatment_sessions" DROP COLUMN "care_recommendation"`);
  }
}
