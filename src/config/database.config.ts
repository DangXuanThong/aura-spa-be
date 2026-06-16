import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export interface DatabaseEnvironment {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  sslEnabled: boolean;
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function readDatabaseEnvironment(): DatabaseEnvironment {
  return {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: readNumber(process.env.POSTGRES_PORT, 5432),
    username: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    database: process.env.POSTGRES_NAME ?? 'aura_spa',
    sslEnabled: process.env.POSTGRES_SSL === 'true',
  };
}

export function buildDataSourceOptions(): DataSourceOptions {
  const env = readDatabaseEnvironment();

  return {
    type: 'postgres',
    host: env.host,
    port: env.port,
    username: env.username,
    password: env.password,
    database: env.database,
    entities: ['dist/**/*.entity.js'],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false, // AURA SPA chỉ đổi schema bằng migration để BE Lead review được.
    migrationsRun: false, // Chạy migration thủ công để tránh app tự sửa DB lúc deploy.
    logging: process.env.NODE_ENV !== 'production',
    ssl: env.sslEnabled ? { rejectUnauthorized: false } : false,
  };
}

export const databaseConfig = registerAs('database', buildDataSourceOptions);

export default new DataSource(buildDataSourceOptions());
