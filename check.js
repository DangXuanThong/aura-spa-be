const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/aura_spa',
  });
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT id, customer_id, branch_id, technician_id, start_time, room, status 
      FROM bookings 
      LIMIT 5
    `);
    console.log('Bookings:', res.rows);
  } catch (e) {
    console.error('Query failed:', e);
  }

  await client.end();
}

main().catch(console.error);
