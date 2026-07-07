const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL.");

    // 1. Clean up existing shifts for branch 7
    await client.query("DELETE FROM staff_schedules WHERE branch_id = 7");
    await client.query("DELETE FROM schedule_requests WHERE branch_id = 7");
    console.log("✓ Cleared old shifts for branch 7.");

    const staff1 = '13'; // Tran Minh Khoa
    const staff2 = '64'; // Tech Da Nang Ngu Hanh Son A
    const managerId = '70'; // Manager Ngũ Hành Sơn

    // Helper to insert a shift
    const insertShift = async (staffId, dateStr, startHour, endHour, label) => {
      const start = new Date(`${dateStr}T${startHour.toString().padStart(2, '0')}:00:00+07:00`);
      const end = new Date(`${dateStr}T${endHour.toString().padStart(2, '0')}:00:00+07:00`);

      const reqRes = await client.query(
        `INSERT INTO schedule_requests (staff_id, branch_id, request_type, status, requested_start, requested_end, reason, reviewed_by, reviewed_at, created_at, updated_at)
         VALUES ($1, 7, 'work_shift', 'approved', $2, $3, $4, $5, NOW(), NOW(), NOW()) RETURNING id`,
        [staffId, start, end, label, managerId]
      );
      const reqId = reqRes.rows[0].id;

      await client.query(
        `INSERT INTO staff_schedules (staff_id, branch_id, start_time, end_time, schedule_type, status, source_request_id, created_by, created_at, updated_at)
         VALUES ($1, 7, $2, $3, 'working', 'active', $4, $5, NOW(), NOW())`,
        [staffId, start, end, reqId, managerId]
      );
    };

    // We will register shifts from July 4th to July 12th
    const dates = [
      { date: '2026-07-04', staffs: [staff1, staff2] }, // Sat: 2 KTV
      { date: '2026-07-05', staffs: [staff1, staff2] }, // Sun: 2 KTV
      { date: '2026-07-06', staffs: [staff1] },          // Mon: 1 KTV (Tran Minh Khoa)
      { date: '2026-07-07', staffs: [staff2] },          // Tue: 1 KTV (Tech A)
      { date: '2026-07-08', staffs: [staff1, staff2] }, // Wed: 2 KTV
      { date: '2026-07-09', staffs: [staff1, staff2] }, // Thu: 2 KTV
      { date: '2026-07-10', staffs: [staff1, staff2] }, // Fri: 2 KTV
      { date: '2026-07-11', staffs: [staff1, staff2] }, // Sat: 2 KTV
      { date: '2026-07-12', staffs: [staff1, staff2] }, // Sun: 2 KTV
    ];

    for (const d of dates) {
      for (const staffId of d.staffs) {
        await insertShift(staffId, d.date, 8, 18, `Ca trực ngày ${d.date}`);
      }
    }

    console.log("✓ Successfully created daily KTV shift differences!");
    console.log("  - Sat (07-04) & Sun (07-05): 2 KTVs working");
    console.log("  - Mon (07-06): Only 1 KTV working (Tran Minh Khoa)");
    console.log("  - Tue (07-07): Only 1 KTV working (Tech A)");
    console.log("  - Other days: 2 KTVs working");

  } catch (err) {
    console.error("❌ Error adjusting shifts:", err);
  } finally {
    await client.end();
  }
}

run();
