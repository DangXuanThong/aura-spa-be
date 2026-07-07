import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStrategies1781800000001 implements MigrationInterface {
  name = 'AddStrategies1781800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "strategy_priority" AS ENUM ('high', 'medium', 'low')`);
    await queryRunner.query(`CREATE TYPE "strategy_status" AS ENUM ('proposed', 'active', 'completed')`);
    await queryRunner.query(`CREATE TYPE "strategy_source" AS ENUM ('manual', 'ai_generated')`);
    await queryRunner.query(
      `CREATE TABLE "strategies" (
        "id" BIGSERIAL NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "badge" varchar(100) NOT NULL,
        "priority" "strategy_priority" NOT NULL DEFAULT 'medium',
        "status" "strategy_status" NOT NULL DEFAULT 'proposed',
        "source" "strategy_source" NOT NULL DEFAULT 'manual',
        "ai_confidence" decimal(4,3),
        "supporting_data" jsonb,
        "created_by" bigint NOT NULL,
        "updated_by" bigint,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_strategies" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_strategies_status" ON "strategies" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_strategies_created_by" ON "strategies" ("created_by")`);
    await queryRunner.query(
      `ALTER TABLE "strategies" ADD CONSTRAINT "FK_strategies_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "strategies" DROP CONSTRAINT "FK_strategies_created_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_strategies_created_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_strategies_status"`);
    await queryRunner.query(`DROP TABLE "strategies"`);
    await queryRunner.query(`DROP TYPE "strategy_source"`);
    await queryRunner.query(`DROP TYPE "strategy_status"`);
    await queryRunner.query(`DROP TYPE "strategy_priority"`);
  }
}
