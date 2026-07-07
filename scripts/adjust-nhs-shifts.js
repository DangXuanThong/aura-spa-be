const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL.");

    // 1. Delete all existing shifts/requests for branch 7 to clean up duplicates
    await client.query("DELETE FROM staff_schedules WHERE branch_id = 7");
    await client.query("DELETE FROM schedule_requests WHERE branch_id = 7");
    console.log("✓ Cleared all old shifts for branch 7.");

    // 2. We will generate shifts for a full week from 2026-07-04 to 2026-07-12
    const staff1 = '13'; // Tran Minh Khoa (KTV 1)
    const staff2 = '64'; // Tech Da Nang Ngu Hanh Son A (KTV 2)
    const managerId = '70'; // Manager Ngũ Hành Sơn

    for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
      const dayNum = (4 + dayOffset).toString().padStart(2, '0');
      const dateStr = `2026-07-${dayNum}`; // generates 2026-07-04 to 2026-07-12
      
      // Technician 1 (Tran Minh Khoa) - Morning Shift: 08:00 to 12:00 VN (01:00 to 05:00 UTC)
      const start1 = new Date(`${dateStr}T08:00:00+07:00`);
      const end1 = new Date(`${dateStr}T12:00:00+07:00`);

      const reqRes1 = await client.query(
        `INSERT INTO schedule_requests (staff_id, branch_id, request_type, status, requested_start, requested_end, reason, reviewed_by, reviewed_at, created_at, updated_at)
         VALUES ($1, 7, 'work_shift', 'approved', $2, $3, 'Ca sáng thực tế', $4, NOW(), NOW(), NOW()) RETURNING id`,
        [staff1, start1, end1, managerId]
      );
      const reqId1 = reqRes1.rows[0].id;

      await client.query(
        `INSERT INTO staff_schedules (staff_id, branch_id, start_time, end_time, schedule_type, status, source_request_id, created_by, created_at, updated_at)
         VALUES ($1, 7, $2, $3, 'working', 'active', $4, $5, NOW(), NOW())`,
        [staff1, start1, end1, reqId1, managerId]
      );

      // Technician 2 (Tech Ngu Hanh Son A) - Afternoon Shift: 13:00 to 18:00 VN (06:00 to 11:00 UTC)
      const start2 = new Date(`${dateStr}T13:00:00+07:00`);
      const end2 = new Date(`${dateStr}T18:00:00+07:00`);

      const reqRes2 = await client.query(
        `INSERT INTO schedule_requests (staff_id, branch_id, request_type, status, requested_start, requested_end, reason, reviewed_by, reviewed_at, created_at, updated_at)
         VALUES ($1, 7, 'work_shift', 'approved', $2, $3, 'Ca chiều thực tế', $4, NOW(), NOW(), NOW()) RETURNING id`,
        [staff2, start2, end2, managerId]
      );
      const reqId2 = reqRes2.rows[0].id;

      await client.query(
        `INSERT INTO staff_schedules (staff_id, branch_id, start_time, end_time, schedule_type, status, source_request_id, created_by, created_at, updated_at)
         VALUES ($1, 7, $2, $3, 'working', 'active', $4, $5, NOW(), NOW())`,
        [staff2, start2, end2, reqId2, managerId]
      );
    }

    console.log("✓ Successfully created contrasting shifts for technicians at branch 7!");
    console.log("  - KTV 1 (Tran Minh Khoa): Morning Shift 08:00 - 12:00");
    console.log("  - KTV 2 (Tech Ngu Hanh Son A): Afternoon Shift 13:00 - 18:00");
    console.log("  - Evening (18:00+): 0 KTV");

  } catch (err) {
    console.error("❌ Error adjusting shifts:", err);
  } finally {
    await client.end();
  }
}

run();
