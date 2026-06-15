import { MigrationInterface, QueryRunner } from 'typeorm';

// Renames the generic PostgreSQL type "enum" (created by TypeORM for the gender
// column in users) to "gender" so the type name is unambiguous.
export class RenameGenderEnum1781600000001 implements MigrationInterface {
    name = 'RenameGenderEnum1781600000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."enum" RENAME TO "gender"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."gender" RENAME TO "enum"`);
    }
}