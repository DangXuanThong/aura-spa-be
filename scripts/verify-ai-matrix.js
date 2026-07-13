/**
 * Verify AI demo seed matrix.
 * Usage: node scripts/verify-ai-matrix.js
 * Requires app DB + prior seed (start:dev bootstrap or manual seed).
 *
 * This script uses pg directly if DATABASE env is available.
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || process.env.POSTGRES_NAME || 'aura_spa',
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  const personas = await client.query(
    `SELECT email FROM users WHERE email LIKE 'ai.customer.%@demo.auraspa.local'`,
  );
  const rich = await client.query(
    `SELECT u.id, COUNT(b.id)::int AS bookings
     FROM users u
     LEFT JOIN bookings b ON b.customer_id = u.id
     WHERE u.email = 'ai.customer.rich@demo.auraspa.local'
     GROUP BY u.id`,
  );
  const empty = await client.query(
    `SELECT u.id, COUNT(b.id)::int AS bookings
     FROM users u
     LEFT JOIN bookings b ON b.customer_id = u.id
     WHERE u.email = 'ai.customer.empty@demo.auraspa.local'
     GROUP BY u.id`,
  );
  const contra = await client.query(
    `SELECT h.contraindications
     FROM users u
     JOIN health_records h ON h.customer_id = u.id
     WHERE u.email = 'ai.customer.contra@demo.auraspa.local'
     LIMIT 1`,
  );
  const strategies = await client.query(
    `SELECT COUNT(*)::int AS c FROM strategies WHERE source = 'ai_generated'`,
  );
  const services = await client.query(
    `SELECT COUNT(*)::int AS c FROM services WHERE status = 'active'`,
  );

  const matrix = {
    personaCount: personas.rowCount,
    richBookings: rich.rows[0]?.bookings ?? 0,
    emptyBookings: empty.rows[0]?.bookings ?? 0,
    contraFlag: Boolean(contra.rows[0]?.contraindications),
    aiStrategies: strategies.rows[0]?.c ?? 0,
    activeServices: services.rows[0]?.c ?? 0,
  };

  const ok =
    matrix.personaCount >= 4 &&
    matrix.richBookings >= 3 &&
    matrix.emptyBookings === 0 &&
    matrix.contraFlag &&
    matrix.aiStrategies >= 2 &&
    matrix.activeServices >= 3;

  console.log(JSON.stringify({ ok, matrix }, null, 2));
  await client.end();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
