const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL.");

    const res = await client.query(
      `SELECT sr.id, sr.branch_id, sr.staff_id, sr.request_type, sr.status, sr.requested_start, sr.requested_end, u.full_name
       FROM schedule_requests sr
       JOIN users u ON sr.staff_id = u.id
       WHERE sr.branch_id = 7 AND sr.status = 'approved' AND sr.request_type = 'work_shift'`
    );
    console.log(`Total approved work_shift in branch 7: ${res.rows.length}`);
    console.log(res.rows.map(r => ({
      id: r.id,
      staffId: r.staff_id,
      name: r.full_name,
      start: r.requested_start,
      end: r.requested_end
    })));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
