const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL.");

    const res = await client.query(
      `SELECT r.id, r.technician_id, r.rating, r.status, u.full_name
       FROM reviews r
       LEFT JOIN users u ON r.technician_id = u.id`
    );
    console.log(`Total reviews in DB: ${res.rows.length}`);
    console.log(res.rows.map(r => ({
      id: r.id,
      techId: r.technician_id,
      name: r.full_name,
      rating: r.rating,
      status: r.status
    })));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
