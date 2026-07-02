import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1781800000002 implements MigrationInterface {
  name = 'AddNotifications1781800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'failed')`);
    await queryRunner.query(`CREATE TYPE "notification_channel" AS ENUM ('email', 'sms', 'both', 'in_app')`);
    await queryRunner.query(
      `CREATE TABLE "notifications" (
        "id" BIGSERIAL NOT NULL,
        "recipient_user_id" bigint,
        "recipient_role" varchar(50),
        "notification_type" varchar(100) NOT NULL,
        "message" text NOT NULL,
        "status" "notification_status" NOT NULL DEFAULT 'pending',
        "channel" "notification_channel" NOT NULL DEFAULT 'in_app',
        "related_entity_type" varchar(100),
        "related_entity_id" varchar(255),
        "read_at" TIMESTAMP WITH TIME ZONE,
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient_user_id" ON "notifications" ("recipient_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient_role" ON "notifications" ("recipient_role")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_status" ON "notifications" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_recipient_role"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_recipient_user_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_channel"`);
    await queryRunner.query(`DROP TYPE "notification_status"`);
  }
}
