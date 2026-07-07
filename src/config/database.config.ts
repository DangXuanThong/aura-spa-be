import 'dotenv/config';
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

function readBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function shouldEnableSsl(host: string): boolean {
  return readBoolean(process.env.POSTGRES_SSL, host.includes('.neon.tech'));
}

function readDatabaseEnvironment(): DatabaseEnvironment {
  const host = process.env.POSTGRES_HOST ?? 'localhost';

  return {
    host,
    port: readNumber(process.env.POSTGRES_PORT, 5432),
    username: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    database: process.env.POSTGRES_DB ?? process.env.POSTGRES_NAME ?? 'aura_spa',
    sslEnabled: shouldEnableSsl(host),
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
    migrations: ['dist/database/migrations/*.js'],
    synchronize: false, // AURA SPA chỉ đổi schema bằng migration để BE Lead review được.
    migrationsRun: false, // Chạy migration thủ công để tránh app tự sửa DB lúc deploy.
    logging: process.env.NODE_ENV !== 'production',
    ssl: env.sslEnabled ? { rejectUnauthorized: false } : false,
  };
}

export const databaseConfig = registerAs('database', buildDataSourceOptions);

export default new DataSource(buildDataSourceOptions());
