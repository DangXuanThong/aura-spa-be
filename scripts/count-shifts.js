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
       JOIN users u ON sr.staff_id = u.id`
    );
    console.log(`Total schedule requests in DB: ${res.rows.length}`);
    console.log(res.rows.map(r => ({
      id: r.id,
      branchId: r.branch_id,
      staffId: r.staff_id,
      name: r.full_name,
      type: r.request_type,
      status: r.status,
      start: r.requested_start,
      end: r.requested_end
    })));

    const branchStaffRes = await client.query(
      `SELECT bs.branch_id, bs.user_id, bs.position, bs.status, u.full_name 
       FROM branch_staff bs
       JOIN users u ON bs.user_id = u.id`
    );
    console.log("Branch Staff assignment in DB:", branchStaffRes.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
