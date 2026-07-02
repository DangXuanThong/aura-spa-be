import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchDailyAggregates1781900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_daily_aggregates" (
        "id"                           bigserial      PRIMARY KEY,
        "branch_id"                    bigint         NOT NULL,
        "aggregate_date"               date           NOT NULL,
        "total_bookings"               int            NOT NULL DEFAULT 0,
        "completed_bookings"           int            NOT NULL DEFAULT 0,
        "cancelled_bookings"           int            NOT NULL DEFAULT 0,
        "no_show_bookings"             int            NOT NULL DEFAULT 0,
        "total_revenue"                numeric(12,2)  NOT NULL DEFAULT 0,
        "avg_service_duration_minutes" int            NOT NULL DEFAULT 0,
        "new_customers"                int            NOT NULL DEFAULT 0,
        "computed_at"                  timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_bda_branch_date" UNIQUE ("branch_id", "aggregate_date")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bda_date" ON "branch_daily_aggregates" ("aggregate_date");`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_daily_aggregates";`);
  }
}
