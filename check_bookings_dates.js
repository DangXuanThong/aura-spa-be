const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/aura_spa',
  });
  await client.connect();

  const res = await client.query(`
    SELECT b.id, b.status, b.start_time, b.end_time, u.full_name as customer
    FROM bookings b
    LEFT JOIN users u ON b.customer_id = u.id
    ORDER BY b.start_time ASC
  `);

  console.log('Bookings in database:');
  console.log(res.rows.map(r => ({
    id: r.id,
    status: r.status,
    startTime: r.start_time,
    customer: r.customer,
  })));

  await client.end();
}

main().catch(console.error);
