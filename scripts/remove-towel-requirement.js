const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL database.");

    // Delete Towel requirement from all services
    const deleteRes = await client.query(
      `DELETE FROM service_inventory_requirements 
       WHERE inventory_item_id = (SELECT id FROM inventory_items WHERE sku = 'INV-SUPPLY-001')`
    );

    console.log(`✓ Removed towel requirements from all services (${deleteRes.rowCount} record(s) deleted).`);
    console.log("ℹ Khăn Tắm Cao Cấp remains in general inventory for tracking but will no longer be consumed during treatments.");

  } catch (err) {
    console.error("❌ Error removing towel requirement:", err);
  } finally {
    await client.end();
  }
}

run();
