import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiInvocationLogs1783300000000 implements MigrationInterface {
  name = 'AddAiInvocationLogs1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_invocation_logs" (
        "id" BIGSERIAL PRIMARY KEY,
        "feature" varchar(50) NOT NULL,
        "user_id" bigint,
        "branch_id" bigint,
        "model" varchar(50) NOT NULL,
        "prompt_tokens" int NOT NULL DEFAULT 0,
        "completion_tokens" int NOT NULL DEFAULT 0,
        "estimated_cost_usd" decimal(10,6) NOT NULL DEFAULT 0,
        "success" boolean NOT NULL DEFAULT true,
        "error_message" text,
        "latency_ms" int NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_invocation_logs_feature" ON "ai_invocation_logs" ("feature")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_invocation_logs_user_id" ON "ai_invocation_logs" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_invocation_logs_created_at" ON "ai_invocation_logs" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_invocation_logs"`);
  }
}
