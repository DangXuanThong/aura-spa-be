const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL database.");

    // 1. Fetch All Branches
    const branchRes = await client.query("SELECT id, code FROM branches");
    if (branchRes.rows.length === 0) {
      console.log("❌ No branches found.");
      return;
    }
    const branches = branchRes.rows;

    // 2. Fetch Customers
    const customersRes = await client.query("SELECT id, email FROM users WHERE role = 'customer' LIMIT 5");
    if (customersRes.rows.length === 0) {
      console.log("❌ No customer users found.");
      return;
    }
    const customerMap = {};
    customersRes.rows.forEach((r, i) => {
      customerMap[i + 1] = r.id; // Map customer 1-5 to DB IDs
    });
    for (let i = 1; i <= 5; i++) {
      if (!customerMap[i]) {
        customerMap[i] = customersRes.rows[0].id;
      }
    }

    // 3. Fetch Technicians
    const techsRes = await client.query("SELECT id FROM users WHERE role = 'staff' LIMIT 5");
    if (techsRes.rows.length === 0) {
      console.log("❌ No technicians found.");
      return;
    }
    const techA = techsRes.rows[0].id;
    const techB = techsRes.rows[1]?.id || techA;

    // 4. Fetch Services
    const serviceRes1 = await client.query("SELECT id FROM services WHERE code = 'SVC-FACIAL-002'");
    const serviceRes2 = await client.query("SELECT id FROM services WHERE code = 'SVC-FACIAL-001'");
    const serviceId2 = serviceRes1.rows[0]?.id || (await client.query("SELECT id FROM services LIMIT 1")).rows[0]?.id;
    const serviceId1 = serviceRes2.rows[0]?.id || serviceId2;

    if (!serviceId2) {
      console.log("❌ No services found in DB.");
      return;
    }

    // 5. Clean up old generated history for all branches
    await client.query(
      "DELETE FROM booking_services WHERE booking_id IN (SELECT id FROM bookings WHERE start_time >= '2026-01-01' AND start_time < '2026-06-30' AND subtotal_amount >= 3000000)"
    );
    await client.query(
      "DELETE FROM bookings WHERE start_time >= '2026-01-01' AND start_time < '2026-06-30' AND subtotal_amount >= 3000000"
    );
    console.log("✓ Cleaned up existing seeded history.");

    let totalCount = 0;

    // 6. Loop and seed for each branch
    for (const br of branches) {
      const bookingsToInsert = [
        // --- Tháng 1 (18,000,000) ---
        { cust: 1, tech: techA, svc: serviceId2, start: '2026-01-10T10:00:00+07:00', end: '2026-01-10T11:30:00+07:00', price: 5000000 },
        { cust: 2, tech: techB, svc: serviceId2, start: '2026-01-12T14:00:00+07:00', end: '2026-01-12T15:30:00+07:00', price: 5000000 },
        { cust: 3, tech: techA, svc: serviceId2, start: '2026-01-15T09:00:00+07:00', end: '2026-01-15T10:30:00+07:00', price: 5000000 },
        { cust: 4, tech: techB, svc: serviceId1, start: '2026-01-20T16:00:00+07:00', end: '2026-01-20T17:00:00+07:00', price: 3000000 },

        // --- Tháng 2 (22,000,000) ---
        { cust: 1, tech: techA, svc: serviceId2, start: '2026-02-05T10:00:00+07:00', end: '2026-02-05T11:30:00+07:00', price: 6000000 },
        { cust: 2, tech: techB, svc: serviceId2, start: '2026-02-12T14:00:00+07:00', end: '2026-02-12T15:30:00+07:00', price: 6000000 },
        { cust: 3, tech: techA, svc: serviceId2, start: '2026-02-18T09:00:00+07:00', end: '2026-02-18T10:30:00+07:00', price: 6000000 },
        { cust: 4, tech: techB, svc: serviceId1, start: '2026-02-25T16:00:00+07:00', end: '2026-02-25T17:00:00+07:00', price: 4000000 },

        // --- Tháng 3 (20,000,000) ---
        { cust: 1, tech: techA, svc: serviceId2, start: '2026-03-05T10:00:00+07:00', end: '2026-03-05T11:30:00+07:00', price: 5000000 },
        { cust: 2, tech: techB, svc: serviceId2, start: '2026-03-12T14:00:00+07:00', end: '2026-03-12T15:30:00+07:00', price: 5000000 },
        { cust: 3, tech: techA, svc: serviceId2, start: '2026-03-18T09:00:00+07:00', end: '2026-03-18T10:30:00+07:00', price: 5000000 },
        { cust: 4, tech: techB, svc: serviceId2, start: '2026-03-25T16:00:00+07:00', end: '2026-03-25T17:30:00+07:00', price: 5000000 },

        // --- Tháng 4 (28,000,000) ---
        { cust: 1, tech: techA, svc: serviceId2, start: '2026-04-05T10:00:00+07:00', end: '2026-04-05T11:30:00+07:00', price: 7000000 },
        { cust: 2, tech: techB, svc: serviceId2, start: '2026-04-12T14:00:00+07:00', end: '2026-04-12T15:30:00+07:00', price: 7000000 },
        { cust: 3, tech: techA, svc: serviceId2, start: '2026-04-18T09:00:00+07:00', end: '2026-04-18T10:30:00+07:00', price: 7000000 },
        { cust: 4, tech: techB, svc: serviceId2, start: '2026-04-25T16:00:00+07:00', end: '2026-04-25T17:30:00+07:00', price: 7000000 },

        // --- Tháng 5 (32,000,000) ---
        { cust: 1, tech: techA, svc: serviceId2, start: '2026-05-05T10:00:00+07:00', end: '2026-05-05T11:30:00+07:00', price: 8000000 },
        { cust: 2, tech: techB, svc: serviceId2, start: '2026-05-12T14:00:00+07:00', end: '2026-05-12T15:30:00+07:00', price: 8000000 },
        { cust: 3, tech: techA, svc: serviceId2, start: '2026-05-18T09:00:00+07:00', end: '2026-05-18T10:30:00+07:00', price: 8000000 },
        { cust: 4, tech: techB, svc: serviceId2, start: '2026-05-25T16:00:00+07:00', end: '2026-05-25T17:30:00+07:00', price: 8000000 },

        // --- Tháng 6 (35,000,000) ---
        { cust: 1, tech: techA, svc: serviceId2, start: '2026-06-02T10:00:00+07:00', end: '2026-06-02T11:30:00+07:00', price: 7000000 },
        { cust: 2, tech: techB, svc: serviceId2, start: '2026-06-05T14:00:00+07:00', end: '2026-06-05T15:30:00+07:00', price: 7000000 },
        { cust: 3, tech: techA, svc: serviceId2, start: '2026-06-10T09:00:00+07:00', end: '2026-06-10T10:30:00+07:00', price: 7000000 },
        { cust: 4, tech: techB, svc: serviceId2, start: '2026-06-15T16:00:00+07:00', end: '2026-06-15T17:30:00+07:00', price: 7000000 },
        { cust: 5, tech: techA, svc: serviceId2, start: '2026-06-20T11:00:00+07:00', end: '2026-06-20T12:30:00+07:00', price: 7000000 },
      ];

      for (const b of bookingsToInsert) {
        const customerId = customerMap[b.cust];
        const res = await client.query(
          `INSERT INTO bookings (
            customer_id, branch_id, technician_id, start_time, end_time,
            status, source, subtotal_amount, discount_amount, deposit_required_amount,
            paid_amount, remaining_amount, created_by, checked_in_at, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
          [
            customerId,
            br.id,
            b.tech,
            b.start,
            b.end,
            "completed",
            "online",
            b.price,
            0,
            0,
            b.price,
            0,
            customerId,
            b.start,
            b.end,
          ]
        );
        const bookingId = res.rows[0].id;

        await client.query(
          `INSERT INTO booking_services (
            booking_id, service_id, quantity, duration_minutes, unit_price,
            discount_amount, final_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [bookingId, b.svc, 1, 90, b.price, 0, b.price]
        );
        totalCount++;
      }
      console.log(`✓ Seeded historical bookings for branch ${br.code}.`);
    }

    console.log(`✓ Successfully seeded ${totalCount} historical bookings across all branches.`);
  } catch (err) {
    console.error("❌ Database seeding error:", err);
  } finally {
    await client.end();
  }
}

run();
