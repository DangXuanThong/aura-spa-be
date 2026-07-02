import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffSchedules1782300000000 implements MigrationInterface {
  name = 'AddStaffSchedules1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type') THEN
          CREATE TYPE "public"."schedule_type" AS ENUM('working', 'day_off', 'leave', 'break');
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status') THEN
          CREATE TYPE "public"."schedule_status" AS ENUM('active', 'cancelled');
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_schedules" (
        "id" BIGSERIAL NOT NULL,
        "staff_id" bigint NOT NULL,
        "branch_id" bigint NOT NULL,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "schedule_type" "public"."schedule_type" NOT NULL DEFAULT 'working',
        "status" "public"."schedule_status" NOT NULL DEFAULT 'active',
        "source_request_id" bigint,
        "created_by" bigint,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_schedules" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_schedules_staff_id" ON "staff_schedules" ("staff_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_schedules_branch_id" ON "staff_schedules" ("branch_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_schedules_status" ON "staff_schedules" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_schedules_staff_time" ON "staff_schedules" ("staff_id", "start_time", "end_time")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_schedules_branch_time" ON "staff_schedules" ("branch_id", "start_time", "end_time")`);
    await queryRunner.query(`
      ALTER TABLE "staff_schedules"
      ADD CONSTRAINT "FK_staff_schedules_staff" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "staff_schedules"
      ADD CONSTRAINT "FK_staff_schedules_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "staff_schedules"
      ADD CONSTRAINT "FK_staff_schedules_source_request" FOREIGN KEY ("source_request_id") REFERENCES "schedule_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "staff_schedules"
      ADD CONSTRAINT "FK_staff_schedules_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "staff_schedules" DROP CONSTRAINT IF EXISTS "FK_staff_schedules_created_by"`);
    await queryRunner.query(`ALTER TABLE "staff_schedules" DROP CONSTRAINT IF EXISTS "FK_staff_schedules_source_request"`);
    await queryRunner.query(`ALTER TABLE "staff_schedules" DROP CONSTRAINT IF EXISTS "FK_staff_schedules_branch"`);
    await queryRunner.query(`ALTER TABLE "staff_schedules" DROP CONSTRAINT IF EXISTS "FK_staff_schedules_staff"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_staff_schedules_branch_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_staff_schedules_staff_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_staff_schedules_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_staff_schedules_branch_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_staff_schedules_staff_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_schedules"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."schedule_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."schedule_type"`);
  }
}
