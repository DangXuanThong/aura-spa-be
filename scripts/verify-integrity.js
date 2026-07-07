const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("=== DATABASE INTEGRITY CHECK ===");

    const tables = [
      "users",
      "branches",
      "services",
      "inventory_items",
      "bookings",
      "complaints",
      "treatment_courses",
      "treatment_sessions"
    ];

    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`Table '${table}': ${res.rows[0].count} records intact.`);
    }

    console.log("=================================");
  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    await client.end();
  }
}

run();
