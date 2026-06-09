import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedUser1780984677599 implements MigrationInterface {
    name = 'UpdatedUser1780984677599'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_status" AS ENUM('pending_verification', 'active', 'suspended', 'deleted')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "status" "public"."user_status" NOT NULL DEFAULT 'pending_verification'`);
        await queryRunner.query(`CREATE TYPE "public"."auth_provider" AS ENUM('email', 'google')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "auth_provider" "public"."auth_provider" NOT NULL DEFAULT 'email'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "provider_user_id" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "full_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar_url" character varying`);
        await queryRunner.query(`CREATE TYPE "public"."enum" AS ENUM('male', 'female', 'other', 'unknown')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "gender" "public"."enum" NOT NULL DEFAULT 'unknown'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "date_of_birth" date`);
        await queryRunner.query(`ALTER TABLE "users" ADD "address" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD "last_login_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "address"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "date_of_birth"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
        await queryRunner.query(`DROP TYPE "public"."enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "full_name"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "provider_user_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_provider"`);
        await queryRunner.query(`DROP TYPE "public"."auth_provider"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."user_status"`);
    }

}
