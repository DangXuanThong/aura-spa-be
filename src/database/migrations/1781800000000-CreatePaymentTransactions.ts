import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTransactions1781800000000 implements MigrationInterface {
  name = 'CreatePaymentTransactions1781800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payment_provider" AS ENUM('sepay', 'manual', 'gateway')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_transaction_type" AS ENUM('deposit', 'full_payment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_transaction_status" AS ENUM('pending', 'paid', 'expired', 'failed', 'cancelled')`,
    );
    await queryRunner.query(`
      CREATE TABLE "payment_transactions" (
        "id" BIGSERIAL NOT NULL,
        "booking_id" bigint NOT NULL,
        "branch_id" bigint NOT NULL,
        "customer_id" bigint NOT NULL,
        "provider" "public"."payment_provider" NOT NULL DEFAULT 'sepay',
        "transaction_type" "public"."payment_transaction_type" NOT NULL DEFAULT 'deposit',
        "status" "public"."payment_transaction_status" NOT NULL DEFAULT 'pending',
        "amount" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'VND',
        "reference_code" character varying(50) NOT NULL,
        "sepay_transaction_id" bigint,
        "bank_reference_code" character varying(100),
        "transfer_content" text,
        "raw_webhook_payload" jsonb,
        "qr_image_url" text,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_tx_sepay_id" UNIQUE ("sepay_transaction_id"),
        CONSTRAINT "UQ_payment_tx_booking_deposit" UNIQUE ("booking_id", "transaction_type")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_tx_reference_code" ON "payment_transactions" ("reference_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_tx_status_expires" ON "payment_transactions" ("status", "expires_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_tx_booking_id" ON "payment_transactions" ("booking_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD CONSTRAINT "FK_payment_tx_booking"
      FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD CONSTRAINT "FK_payment_tx_branch"
      FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD CONSTRAINT "FK_payment_tx_customer"
      FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_payment_tx_customer"`);
    await queryRunner.query(`ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_payment_tx_branch"`);
    await queryRunner.query(`ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_payment_tx_booking"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_tx_booking_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_tx_status_expires"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_tx_reference_code"`);
    await queryRunner.query(`DROP TABLE "payment_transactions"`);
    await queryRunner.query(`DROP TYPE "public"."payment_transaction_status"`);
    await queryRunner.query(`DROP TYPE "public"."payment_transaction_type"`);
    await queryRunner.query(`DROP TYPE "public"."payment_provider"`);
  }
}
