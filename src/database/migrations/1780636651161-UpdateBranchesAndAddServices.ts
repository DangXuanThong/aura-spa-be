import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBranchesAndAddServices1780636651161 implements MigrationInterface {
  name = 'UpdateBranchesAndAddServices1780636651161';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update branches table - Add new columns first
    await queryRunner.query(`ALTER TABLE "branches" ADD COLUMN "code" character varying(50) NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "branches" ADD COLUMN "city" character varying(100) NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "branches" ADD COLUMN "district" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "branches" RENAME COLUMN "phone_number" TO "phone"`);

    // Create enum type for branch_status
    await queryRunner.query(
      `CREATE TYPE "public"."branch_status" AS ENUM('active', 'inactive', 'maintenance', 'closed')`,
    );

    // Add new status column with enum type, default to 'active'
    await queryRunner.query(`ALTER TABLE "branches" ADD COLUMN "status_new" "public"."branch_status" NOT NULL DEFAULT 'active'`);

    // Drop old is_active column and rename new one
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "is_active"`);
    await queryRunner.query(`ALTER TABLE "branches" RENAME COLUMN "status_new" TO "status"`);

    // Change address from varchar to text
    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "address" TYPE text`);

    // Change id from BIGSERIAL to UUID
    await queryRunner.query(`ALTER TABLE "branches" DROP CONSTRAINT "PK_7f37d3b42defea97f1df0d19535"`);
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "branches" ADD COLUMN "id" uuid NOT NULL DEFAULT gen_random_uuid()`);
    await queryRunner.query(`ALTER TABLE "branches" ADD PRIMARY KEY ("id")`);

    // Update latitude/longitude to numeric
    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "latitude" TYPE numeric(10,8)`);
    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "longitude" TYPE numeric(11,8)`);

    // Add indexes
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_branches_code_unique" ON "branches" ("code")`);
    await queryRunner.query(`DROP INDEX "public"."IDX_branches_name_unique"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_branches_name_unique" ON "branches" ("name")`);

    // Create service_status enum
    await queryRunner.query(
      `CREATE TYPE "public"."service_status" AS ENUM('active', 'inactive', 'archived')`,
    );

    // Create services table
    await queryRunner.query(`
      CREATE TABLE "services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" character varying(100) NOT NULL,
        "name" character varying(150) NOT NULL,
        "slug" character varying(255) NOT NULL,
        "category" character varying(100),
        "description" text,
        "default_duration_minutes" integer NOT NULL,
        "default_price" numeric(10,2) NOT NULL,
        "status" "public"."service_status" NOT NULL DEFAULT 'active',
        "is_multi_session" boolean NOT NULL DEFAULT false,
        "total_sessions" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_services_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_services_code_unique" ON "services" ("code")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_services_slug_unique" ON "services" ("slug")`);

    // Create branch_services table
    await queryRunner.query(`
      CREATE TABLE "branch_services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "branch_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "duration_minutes_override" integer,
        "price_override" numeric(10,2),
        "max_parallel_bookings" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_services_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_branch_services_branch_id" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_branch_services_service_id" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_branch_services_branch_service" ON "branch_services" ("branch_id", "service_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop branch_services table
    await queryRunner.query(`DROP INDEX "public"."IDX_branch_services_branch_service"`);
    await queryRunner.query(`DROP TABLE "branch_services"`);

    // Drop services table
    await queryRunner.query(`DROP INDEX "public"."IDX_services_slug_unique"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_services_code_unique"`);
    await queryRunner.query(`DROP TABLE "services"`);
    await queryRunner.query(`DROP TYPE "public"."service_status"`);

    // Revert branches changes
    await queryRunner.query(`DROP INDEX "public"."IDX_branches_name_unique"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_branches_code_unique"`);

    // Change id back to BIGSERIAL
    await queryRunner.query(`ALTER TABLE "branches" DROP CONSTRAINT "PK_branches_id"`);
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "branches" ADD COLUMN "id" BIGSERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "branches" ADD CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id")`,
    );

    // Revert coordinate types
    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "latitude" TYPE double precision`);
    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "longitude" TYPE double precision`);

    // Revert address type
    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "address" TYPE character varying(255)`);

    // Revert status to is_active
    await queryRunner.query(`ALTER TABLE "branches" ADD COLUMN "is_active" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."branch_status"`);

    // Rename phone back
    await queryRunner.query(`ALTER TABLE "branches" RENAME COLUMN "phone" TO "phone_number"`);

    // Remove new columns
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "district"`);
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "city"`);
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "code"`);

    // Recreate old index
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_branches_name_unique" ON "branches" ("name")`);
  }
}
