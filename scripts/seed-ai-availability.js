/**
 * Seed approved work_shift rows for all active technicians (next 21 days, +07).
 * Fixes availability maxCapacity=0 when no shifts exist.
 *
 * Usage: node scripts/seed-ai-availability.js
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST === '0.0.0.0' ? 'localhost' : process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || process.env.POSTGRES_NAME || 'aura_spa',
  });
  await client.connect();

  await client.query(`DELETE FROM schedule_requests WHERE reason LIKE 'AI demo availability%'`);

  const res = await client.query(`
    INSERT INTO schedule_requests (staff_id, branch_id, request_type, requested_start, requested_end, status, reason, reviewed_at)
    SELECT
      bs.user_id,
      bs.branch_id,
      'work_shift'::schedule_request_type,
      (to_char(d.day, 'YYYY-MM-DD') || ' 09:00:00+07')::timestamptz,
      (to_char(d.day, 'YYYY-MM-DD') || ' 20:00:00+07')::timestamptz,
      'approved'::approval_status,
      'AI demo availability seed',
      now()
    FROM branch_staff bs
    CROSS JOIN (
      SELECT generate_series(CURRENT_DATE, CURRENT_DATE + 20, '1 day'::interval)::date AS day
    ) d
    WHERE bs.status = 'active'
      AND bs.position = 'technician'
      AND EXISTS (SELECT 1 FROM branches b WHERE b.id = bs.branch_id AND b.status = 'active')
    RETURNING id
  `);

  console.log(JSON.stringify({ ok: true, inserted: res.rowCount }, null, 2));
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
