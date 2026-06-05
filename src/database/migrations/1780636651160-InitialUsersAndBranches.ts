import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialUsersAndBranches1780636651160 implements MigrationInterface {
    name = 'InitialUsersAndBranches1780636651160'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_role" AS ENUM('owner', 'manager', 'staff', 'customer')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "email" character varying(255), "phone" character varying(10), "password_hash" character varying(255) NOT NULL, "role" "public"."user_role" NOT NULL DEFAULT 'customer', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_phone_unique" ON "users" ("phone") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email_unique" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "branches" ("id" BIGSERIAL NOT NULL, "name" character varying(150) NOT NULL, "address" character varying(255) NOT NULL, "phone_number" character varying(20), "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_branches_name_unique" ON "branches" ("name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_branches_name_unique"`);
        await queryRunner.query(`DROP TABLE "branches"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_email_unique"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_phone_unique"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."user_role"`);
    }

}
