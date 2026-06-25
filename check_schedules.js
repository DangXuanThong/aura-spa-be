const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/aura_spa',
  });
  await client.connect();
  const res = await client.query(`
    SELECT ss.*, u.full_name, u.role, b.name as branch_name 
    FROM staff_schedules ss
    JOIN users u ON ss.staff_id = u.id
    JOIN branches b ON ss.branch_id = b.id
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
