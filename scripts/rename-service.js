const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL database.");

    // Update service name and description
    await client.query(
      `UPDATE services 
       SET name = 'Tẩy Tế Bào Chết Muối Biển', 
           slug = 'tay-te-bao-chet-muoi-bien',
           description = 'Làm mịn da và kích thích tái tạo tế bào mới với muối biển hạt mịn.' 
       WHERE code = 'SVC-NAIL-001'`
    );

    console.log("✓ Successfully renamed service SVC-NAIL-001 in database.");

  } catch (err) {
    console.error("❌ Error updating service name:", err);
  } finally {
    await client.end();
  }
}

run();
