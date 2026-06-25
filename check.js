const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/aura_spa',
  });
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT technician_id AS "technicianId", AVG(rating) AS "avgRating"
      FROM reviews
      WHERE technician_id IN ($1) AND status = 'published'
      GROUP BY technician_id
    `, ['7']);
    console.log('Query result:', res.rows);
  } catch (e) {
    console.error('Query failed:', e);
  }

  await client.end();
}

main().catch(console.error);
