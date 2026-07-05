const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL.");

    // 1. Get password hash of existing technician
    const pwdRes = await client.query("SELECT password_hash FROM users WHERE email = 'tech.dannhs.a@demo.auraspa.local'");
    const pwdHash = pwdRes.rows[0].password_hash;

    // Helper to insert a user if not exists
    const getOrCreateUser = async (email, fullName, phone) => {
      const exist = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      if (exist.rows.length > 0) {
        return exist.rows[0].id;
      }
      const res = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'staff', 'active', NOW(), NOW()) RETURNING id`,
        [email, pwdHash, fullName, phone]
      );
      return res.rows[0].id;
    };

    // Helper to insert branch assignment if not exists
    const getOrCreateAssignment = async (userId, branchId, staffCode) => {
      const exist = await client.query("SELECT id FROM branch_staff WHERE user_id = $1 AND branch_id = $2", [userId, branchId]);
      if (exist.rows.length > 0) {
        return;
      }
      await client.query(
        `INSERT INTO branch_staff (branch_id, user_id, position, status, staff_code, start_date, created_at, updated_at)
         VALUES ($1, $2, 'technician', 'active', $3, NOW(), NOW(), NOW())`,
        [branchId, userId, staffCode]
      );
    };

    // Create 3 new technicians for branch 7
    const techBId = await getOrCreateUser('tech.dannhs.b@demo.auraspa.local', 'Nguyễn Hoàng Nam', '0901234561');
    const techCId = await getOrCreateUser('tech.dannhs.c@demo.auraspa.local', 'Lê Thị Mai', '0901234562');
    const techDId = await getOrCreateUser('tech.dannhs.d@demo.auraspa.local', 'Phạm Minh Tuấn', '0901234563');

    await getOrCreateAssignment(techBId, 7, 'TECH-DAN-NHS-B');
    await getOrCreateAssignment(techCId, 7, 'TECH-DAN-NHS-C');
    await getOrCreateAssignment(techDId, 7, 'TECH-DAN-NHS-D');

    console.log("✓ Staff members created and assigned to Ngũ Hành Sơn.");

    // Clean up existing shifts for branch 7
    await client.query("DELETE FROM staff_schedules WHERE branch_id = 7");
    await client.query("DELETE FROM schedule_requests WHERE branch_id = 7");
    console.log("✓ Cleared old shifts for branch 7.");

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

    // We will register shifts from July 4th to July 12th for these 5 technicians
    for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
      const dayNum = (4 + dayOffset).toString().padStart(2, '0');
      const dateStr = `2026-07-${dayNum}`; // generates 2026-07-04 to 2026-07-12
      
      // Let's create shifts for each technician on each date:
      
      // 1. Tran Minh Khoa: Works BOTH Morning (08:00 - 12:00) and Afternoon (13:00 - 20:00)
      await insertShift('13', dateStr, 8, 12, 'Ca sáng Trần Minh Khoa');
      await insertShift('13', dateStr, 13, 20, 'Ca chiều Trần Minh Khoa');

      // 2. Tech A (64): Works Afternoon (13:00 - 20:00)
      await insertShift('64', dateStr, 13, 20, 'Ca chiều Tech A');

      // 3. Tech B: Works Full Day (08:00 - 20:00) to cover morning, noon, afternoon
      await insertShift(techBId, dateStr, 8, 20, 'Ca gộp Tech B');

      // 4. Tech C: Works Full Day (08:00 - 20:00) to cover morning, noon, afternoon
      await insertShift(techCId, dateStr, 8, 20, 'Ca gộp Tech C');

      // 5. Tech D: Works Afternoon (13:00 - 20:00)
      await insertShift(techDId, dateStr, 13, 20, 'Ca chiều Tech D');
    }

    console.log("✓ Successfully created shifts for all 5 technicians at branch 7!");
    console.log("  - Morning (08:00 - 12:00): 3 KTVs working (Tran Minh Khoa, Tech B, Tech C)");
    console.log("  - Lunch hour (12:00 - 13:00): 2 KTVs working (Tech B, Tech C)");
    console.log("  - Afternoon/Evening (13:00 - 20:00): 5 KTVs working (Tran Minh Khoa, Tech A, Tech B, Tech C, Tech D)");
    console.log("  - No empty slots between 08:00 and 20:00!");

  } catch (err) {
    console.error("❌ Error setting up shifts:", err);
  } finally {
    await client.end();
  }
}

run();
