import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoyaltyTables1782500000000 implements MigrationInterface {
  name = 'CreateLoyaltyTables1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_transaction_type') THEN
          CREATE TYPE "loyalty_transaction_type" AS ENUM ('earn', 'redeem', 'adjust');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_accounts" (
        "id" BIGSERIAL PRIMARY KEY,
        "customer_id" bigint NOT NULL,
        "tier" varchar(50) NOT NULL DEFAULT 'Aura Member',
        "points_balance" integer NOT NULL DEFAULT 0,
        "lifetime_points" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_loyalty_accounts_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_loyalty_accounts_customer_unique" ON "loyalty_accounts" ("customer_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
        "id" BIGSERIAL PRIMARY KEY,
        "account_id" bigint NOT NULL,
        "customer_id" bigint NOT NULL,
        "booking_id" bigint NULL,
        "payment_id" bigint NULL,
        "type" "loyalty_transaction_type" NOT NULL,
        "points" integer NOT NULL,
        "source" varchar(80) NOT NULL,
        "description" text NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_loyalty_transactions_account" FOREIGN KEY ("account_id") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_loyalty_transactions_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_loyalty_transactions_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_loyalty_transactions_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_transactions_account_created" ON "loyalty_transactions" ("account_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_transactions_customer_created" ON "loyalty_transactions" ("customer_id", "created_at")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_loyalty_transactions_payment_unique" ON "loyalty_transactions" ("payment_id") WHERE "payment_id" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_loyalty_transactions_payment_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_loyalty_transactions_customer_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_loyalty_transactions_account_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loyalty_transactions"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_loyalty_accounts_customer_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loyalty_accounts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "loyalty_transaction_type"`);
  }
}
