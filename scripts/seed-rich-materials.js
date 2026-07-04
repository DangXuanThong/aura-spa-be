const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL database.");

    // 1. Define materials to seed
    const materials = [
      { sku: 'INV-SERUM-001', name: 'Vitamin C Serum dưỡng trắng', unit: 'chai', category: 'Facial', min: 10, qty: 25 },
      { sku: 'INV-TONER-001', name: 'Nước hoa hồng dưỡng ẩm', unit: 'chai', category: 'Facial', min: 8, qty: 20 },
      { sku: 'INV-OIL-001', name: 'Tinh dầu massage lavender', unit: 'chai', category: 'Body', min: 20, qty: 45 },
      { sku: 'INV-NAIL-001', name: 'Sơn gel màu cao cấp', unit: 'lọ', category: 'Nail', min: 20, qty: 50 },
      { sku: 'INV-OIL-002', name: 'Tinh Dầu Sả Chanh', unit: 'chai', category: 'Body', min: 20, qty: 12 },
      { sku: 'INV-TOOL-001', name: 'Đá Bazan Massage', unit: 'bộ', category: 'Body', min: 5, qty: 8 },
      { sku: 'INV-SUPPLY-001', name: 'Khăn Tắm Cao Cấp', unit: 'cái', category: 'General', min: 30, qty: 85 },
      { sku: 'INV-SALT-001', name: 'Muối Khoáng Ngâm', unit: 'kg', category: 'Body', min: 10, qty: 6 },
      { sku: 'INV-SERUM-002', name: 'Serum Tế Bào Gốc', unit: 'lọ', category: 'Facial', min: 10, qty: 18 },
      { sku: 'INV-MASK-001', name: 'Mặt Nạ Trà Xanh Dưỡng Da', unit: 'miếng', category: 'Facial', min: 25, qty: 40 },
      { sku: 'INV-CREAM-001', name: 'Kem Chống Nắng Vật Lý', unit: 'tuýp', category: 'Facial', min: 8, qty: 15 },
    ];

    const skuToId = {};

    // 2. Insert inventory_items
    for (const m of materials) {
      const res = await client.query(
        "SELECT id FROM inventory_items WHERE sku = $1",
        [m.sku]
      );

      let itemId;
      if (res.rows.length === 0) {
        const insertRes = await client.query(
          `INSERT INTO inventory_items (sku, name, unit, category, min_stock_level, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
          [m.sku, m.name, m.unit, m.category, m.min, "active"]
        );
        itemId = insertRes.rows[0].id;
        console.log(`+ Created inventory item: ${m.name} (${m.sku})`);
      } else {
        itemId = res.rows[0].id;
        // Update name and min_stock_level to match new values if needed
        await client.query(
          "UPDATE inventory_items SET name = $1, min_stock_level = $2 WHERE id = $3",
          [m.name, m.min, itemId]
        );
      }
      skuToId[m.sku] = itemId;
    }

    // 3. Populate branch inventory levels for each branch
    const branchRes = await client.query("SELECT id, code FROM branches");
    for (const br of branchRes.rows) {
      for (const m of materials) {
        const itemId = skuToId[m.sku];
        const res = await client.query(
          "SELECT id FROM branch_inventory WHERE branch_id = $1 AND inventory_item_id = $2",
          [br.id, itemId]
        );

        if (res.rows.length === 0) {
          await client.query(
            `INSERT INTO branch_inventory (branch_id, inventory_item_id, current_quantity, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())`,
            [br.id, itemId, m.qty]
          );
        } else {
          // Sync current quantity to matched mock value
          await client.query(
            "UPDATE branch_inventory SET current_quantity = $1 WHERE id = $2",
            [m.qty, res.rows[0].id]
          );
        }
      }
      console.log(`✓ Synced inventory levels for branch ${br.code}.`);
    }

    // 4. Define service requirements
    const requirements = [
      // SVC-FACIAL-001 (Cấp Ẩm Chuyên Sâu Radiance)
      { svcCode: 'SVC-FACIAL-001', sku: 'INV-SERUM-001', qty: 0.1 },
      { svcCode: 'SVC-FACIAL-001', sku: 'INV-TONER-001', qty: 0.1 },
      { svcCode: 'SVC-FACIAL-001', sku: 'INV-SUPPLY-001', qty: 1.0 },

      // SVC-FACIAL-002 (Trẻ Hóa Da Tế Bào Gốc)
      { svcCode: 'SVC-FACIAL-002', sku: 'INV-SERUM-002', qty: 0.2 },
      { svcCode: 'SVC-FACIAL-002', sku: 'INV-TONER-001', qty: 0.15 },
      { svcCode: 'SVC-FACIAL-002', sku: 'INV-MASK-001', qty: 1.0 },
      { svcCode: 'SVC-FACIAL-002', sku: 'INV-SUPPLY-001', qty: 1.0 },

      // SVC-MASSAGE-002 (Massage Thụy Điển Cổ Điển)
      { svcCode: 'SVC-MASSAGE-002', sku: 'INV-OIL-001', qty: 0.15 },
      { svcCode: 'SVC-MASSAGE-002', sku: 'INV-SUPPLY-001', qty: 2.0 },

      // SVC-BODY-001 (Massage Đá Nóng Núi Lửa)
      { svcCode: 'SVC-BODY-001', sku: 'INV-OIL-002', qty: 0.2 },
      { svcCode: 'SVC-BODY-001', sku: 'INV-TOOL-001', qty: 0.05 },
      { svcCode: 'SVC-BODY-001', sku: 'INV-SUPPLY-001', qty: 2.0 },

      // SVC-NAIL-001 (Tẩy Tế Bào Chết Muối Biển & Cà Phê)
      { svcCode: 'SVC-NAIL-001', sku: 'INV-SALT-001', qty: 0.2 },
      { svcCode: 'SVC-NAIL-001', sku: 'INV-SUPPLY-001', qty: 1.0 },

      // SVC-BODY-002 (Ủ Bùn Khoáng Thiên Nhiên)
      { svcCode: 'SVC-BODY-002', sku: 'INV-SALT-001', qty: 0.3 },
      { svcCode: 'SVC-BODY-002', sku: 'INV-SUPPLY-001', qty: 2.0 },

      // SVC-PACKAGE-001 (Gói "Tâm An" Serenity Journey)
      { svcCode: 'SVC-PACKAGE-001', sku: 'INV-OIL-001', qty: 0.25 },
      { svcCode: 'SVC-PACKAGE-001', sku: 'INV-SERUM-001', qty: 0.1 },
      { svcCode: 'SVC-PACKAGE-001', sku: 'INV-TONER-001', qty: 0.1 },
      { svcCode: 'SVC-PACKAGE-001', sku: 'INV-SUPPLY-001', qty: 3.0 },

      // SVC-PACKAGE-002 (Gói "Song Hành" Couples Retreat)
      { svcCode: 'SVC-PACKAGE-002', sku: 'INV-OIL-001', qty: 0.3 },
      { svcCode: 'SVC-PACKAGE-002', sku: 'INV-NAIL-001', qty: 0.1 },
      { svcCode: 'SVC-PACKAGE-002', sku: 'INV-SUPPLY-001', qty: 4.0 },
    ];

    // 5. Clear old requirements and insert new ones
    await client.query("DELETE FROM service_inventory_requirements");
    console.log("✓ Cleared old service inventory requirements.");

    for (const req of requirements) {
      const svcRes = await client.query("SELECT id FROM services WHERE code = $1", [req.svcCode]);
      const itemId = skuToId[req.sku];

      if (svcRes.rows.length > 0 && itemId) {
        await client.query(
          `INSERT INTO service_inventory_requirements (service_id, inventory_item_id, quantity_per_service, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [svcRes.rows[0].id, itemId, req.qty, true]
        );
      }
    }
    console.log("✓ Successfully configured new realistic requirements for all 8 services.");

  } catch (err) {
    console.error("❌ Seeding materials error:", err);
  } finally {
    await client.end();
  }
}

run();
