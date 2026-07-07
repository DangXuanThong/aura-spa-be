import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityLogs1781800000000 implements MigrationInterface {
  name = 'AddActivityLogs1781800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "activity_logs" (
        "id" BIGSERIAL NOT NULL,
        "user_id" bigint,
        "user_role" varchar(50),
        "branch_id" bigint,
        "action" varchar(100) NOT NULL,
        "entity_type" varchar(100),
        "entity_id" varchar(255),
        "metadata" jsonb,
        "ip_address" varchar(45),
        "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_activity_logs" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_user_id" ON "activity_logs" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_branch_id" ON "activity_logs" ("branch_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_action" ON "activity_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_occurred_at" ON "activity_logs" ("occurred_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_activity_logs_occurred_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_activity_logs_action"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_activity_logs_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_activity_logs_user_id"`);
    await queryRunner.query(`DROP TABLE "activity_logs"`);
  }
}
