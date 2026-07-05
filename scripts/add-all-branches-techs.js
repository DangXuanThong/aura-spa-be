const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL.");

    // Get password hash of an existing user
    const pwdRes = await client.query("SELECT password_hash FROM users WHERE role = 'staff' LIMIT 1");
    const pwdHash = pwdRes.rows[0].password_hash;

    // Get all branches
    const branchesRes = await client.query("SELECT id, name, code FROM branches");
    const branches = branchesRes.rows;
    console.log(`Found ${branches.length} branches.`);

    for (const branch of branches) {
      console.log(`Processing branch: ${branch.name} (Code: ${branch.code}, ID: ${branch.id})`);
      
      // 1. Find existing technicians for this branch
      const techsRes = await client.query(
        `SELECT u.id, u.email, u.full_name
         FROM branch_staff bs
         JOIN users u ON bs.user_id = u.id
         WHERE bs.branch_id = $1 AND bs.position = 'technician' AND bs.status = 'active'`,
        [branch.id]
      );
      let techs = techsRes.rows;
      console.log(`  - Existing technicians: ${techs.length}`);

      // 2. If fewer than 5, create more to reach exactly 5
      const branchLower = branch.code.toLowerCase().replace('-', '');
      const techNames = [
        `Tech ${branch.code} A`,
        `Tech ${branch.code} B`,
        `Tech ${branch.code} C`,
        `Tech ${branch.code} D`,
        `Tech ${branch.code} E`
      ];

      while (techs.length < 5) {
        const nextIndex = techs.length;
        const email = `tech.${branchLower}.${String.fromCharCode(97 + nextIndex)}@demo.auraspa.local`; // e.g. tech.hcmq1.c@...
        const fullName = techNames[nextIndex];
        const phone = `090${branch.id}${nextIndex}12345`;

        // Check if user exists
        let userId;
        const userExist = await client.query("SELECT id FROM users WHERE email = $1", [email]);
        if (userExist.rows.length > 0) {
          userId = userExist.rows[0].id;
        } else {
          const userRes = await client.query(
            `INSERT INTO users (email, password_hash, full_name, phone, role, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'staff', 'active', NOW(), NOW()) RETURNING id`,
            [email, pwdHash, fullName, phone]
          );
          userId = userRes.rows[0].id;
        }

        // Check assignment
        const assignExist = await client.query("SELECT id FROM branch_staff WHERE user_id = $1 AND branch_id = $2", [userId, branch.id]);
        if (assignExist.rows.length === 0) {
          await client.query(
            `INSERT INTO branch_staff (branch_id, user_id, position, status, staff_code, start_date, created_at, updated_at)
             VALUES ($1, $2, 'technician', 'active', $3, NOW(), NOW(), NOW())`,
            [branch.id, userId, `TECH-${branch.code}-${String.fromCharCode(65 + nextIndex)}`]
          );
        }

        techs.push({ id: userId, email, fullName });
      }
      console.log(`  - Total technicians now: ${techs.length}`);

      // 3. Find manager for this branch (to set as reviewer)
      const mgrRes = await client.query(
        `SELECT user_id FROM branch_staff WHERE branch_id = $1 AND position = 'manager' AND status = 'active' LIMIT 1`,
        [branch.id]
      );
      const managerId = mgrRes.rows.length > 0 ? mgrRes.rows[0].user_id : '1';

      // 4. Clear all shifts for this branch
      await client.query("DELETE FROM staff_schedules WHERE branch_id = $1", [branch.id]);
      await client.query("DELETE FROM schedule_requests WHERE branch_id = $1", [branch.id]);
      console.log(`  - Cleared old shifts.`);

      // 5. Register shifts from July 4th to July 12th for these 5 technicians
      const t1 = techs[0].id;
      const t2 = techs[1].id;
      const t3 = techs[2].id;
      const t4 = techs[3].id;
      const t5 = techs[4].id;

      // Helper to insert a shift
      const insertShift = async (staffId, dateStr, startHour, endHour, label) => {
        const start = new Date(`${dateStr}T${startHour.toString().padStart(2, '0')}:00:00+07:00`);
        const end = new Date(`${dateStr}T${endHour.toString().padStart(2, '0')}:00:00+07:00`);

        const reqRes = await client.query(
          `INSERT INTO schedule_requests (staff_id, branch_id, request_type, status, requested_start, requested_end, reason, reviewed_by, reviewed_at, created_at, updated_at)
           VALUES ($1, $2, 'work_shift', 'approved', $3, $4, $5, $6, NOW(), NOW(), NOW()) RETURNING id`,
          [staffId, branch.id, start, end, label, managerId]
        );
        const reqId = reqRes.rows[0].id;

        await client.query(
          `INSERT INTO staff_schedules (staff_id, branch_id, start_time, end_time, schedule_type, status, source_request_id, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'working', 'active', $5, $6, NOW(), NOW())`,
          [staffId, branch.id, start, end, reqId, managerId]
        );
      };

      for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
        const dayNum = (4 + dayOffset).toString().padStart(2, '0');
        const dateStr = `2026-07-${dayNum}`;

        await insertShift(t1, dateStr, 8, 12, 'Ca sáng T1');
        await insertShift(t1, dateStr, 13, 20, 'Ca chiều T1');

        await insertShift(t2, dateStr, 13, 20, 'Ca chiều T2');

        await insertShift(t3, dateStr, 8, 20, 'Ca gộp T3');
        await insertShift(t4, dateStr, 8, 20, 'Ca gộp T4');

        await insertShift(t5, dateStr, 13, 20, 'Ca chiều T5');
      }
      console.log(`  - Roster shifts successfully created for ${branch.code}.`);
    }

    console.log("✓ All branches successfully populated with KTVs and rosters!");

  } catch (err) {
    console.error("❌ Error setting up all branch shifts:", err);
  } finally {
    await client.end();
  }
}

run();
