const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CLEANUP_LEGACY = process.argv.includes('--cleanup-legacy');

const PASSWORDS = {
  owner: 'Owner123!',
  manager: 'Manager123!',
  staff: 'Staff123!',
  customer: 'Customer123!',
};

const USERS = [
  { role: 'owner', fullName: 'Demo Owner', email: 'owner@demo.auraspa.local', phone: '0910000001', gender: 'unknown' },

  { role: 'manager', fullName: 'Manager HCM Q1', email: 'manager.hcmq1@demo.auraspa.local', phone: '0910000101', gender: 'unknown', branchCode: 'HCM-Q1' },
  { role: 'manager', fullName: 'Manager HCM Q7', email: 'manager.hcmq7@demo.auraspa.local', phone: '0910000102', gender: 'unknown', branchCode: 'HCM-Q7' },
  { role: 'manager', fullName: 'Manager Ha Noi Hoan Kiem', email: 'manager.hanhk@demo.auraspa.local', phone: '0910000103', gender: 'unknown', branchCode: 'HAN-HK' },
  { role: 'manager', fullName: 'Manager Da Nang Song Han', email: 'manager.danhc@demo.auraspa.local', phone: '0910000104', gender: 'unknown', branchCode: 'DAN-HC' },
  { role: 'manager', fullName: 'Manager Da Nang My Khe', email: 'manager.danmk@demo.auraspa.local', phone: '0910000105', gender: 'unknown', branchCode: 'DAN-MK' },
  { role: 'manager', fullName: 'Manager Da Nang Ngu Hanh Son', email: 'manager.dannhs@demo.auraspa.local', phone: '0910000106', gender: 'unknown', branchCode: 'DAN-NHS' },

  { role: 'staff', fullName: 'Tech HCM Q1 A', email: 'tech.hcmq1.a@demo.auraspa.local', phone: '0910000201', gender: 'unknown', branchCode: 'HCM-Q1' },
  { role: 'staff', fullName: 'Tech HCM Q1 B', email: 'tech.hcmq1.b@demo.auraspa.local', phone: '0910000202', gender: 'unknown', branchCode: 'HCM-Q1' },
  { role: 'staff', fullName: 'Tech HCM Q7 A', email: 'tech.hcmq7.a@demo.auraspa.local', phone: '0910000203', gender: 'unknown', branchCode: 'HCM-Q7' },
  { role: 'staff', fullName: 'Tech Ha Noi Hoan Kiem A', email: 'tech.hanhk.a@demo.auraspa.local', phone: '0910000204', gender: 'unknown', branchCode: 'HAN-HK' },
  { role: 'staff', fullName: 'Tech Da Nang Song Han A', email: 'tech.danhc.a@demo.auraspa.local', phone: '0910000205', gender: 'unknown', branchCode: 'DAN-HC' },
  { role: 'staff', fullName: 'Tech Da Nang My Khe A', email: 'tech.danmk.a@demo.auraspa.local', phone: '0910000206', gender: 'unknown', branchCode: 'DAN-MK' },
  { role: 'staff', fullName: 'Tech Da Nang Ngu Hanh Son A', email: 'tech.dannhs.a@demo.auraspa.local', phone: '0910000207', gender: 'unknown', branchCode: 'DAN-NHS' },

  { role: 'customer', fullName: 'Customer Demo One', email: 'customer.one@demo.auraspa.local', phone: '0910000301', gender: 'unknown' },
  { role: 'customer', fullName: 'Customer Demo Two', email: 'customer.two@demo.auraspa.local', phone: '0910000302', gender: 'unknown' },
  { role: 'customer', fullName: 'Customer Demo Three', email: 'customer.three@demo.auraspa.local', phone: '0910000303', gender: 'unknown' },
  { role: 'customer', fullName: 'Customer Demo Four', email: 'customer.four@demo.auraspa.local', phone: '0910000304', gender: 'unknown' },
  { role: 'customer', fullName: 'Customer Demo Five', email: 'customer.five@demo.auraspa.local', phone: '0910000305', gender: 'unknown' },
];

const LEGACY_SEED_EMAILS = [
  'owner@gmail.com',
  'lan.nguyen@gmail.com',
  'minh.tran@gmail.com',
  'hoa.le@gmail.com',
  'bao.pham@gmail.com',
  'mai.hoang@gmail.com',
  'lan.staff@aura-spa.com',
  'duc.nguyen@aura-spa.com',
  'bich.tran@aura-spa.com',
  'long.pham@aura-spa.com',
  'an.nguyen.dn@aura-spa.com',
  'thuy.le.dn@aura-spa.com',
  'khoa.tran.dn@aura-spa.com',
  'huong.manager@aura-spa.com',
  'khanh.manager@aura-spa.com',
  'phuong.manager@aura-spa.com',
  'dung.manager.dn@aura-spa.com',
];

const LEGACY_USER_MAPPINGS = [
  ['owner@gmail.com', 'owner@demo.auraspa.local'],
  ['lan.nguyen@gmail.com', 'customer.one@demo.auraspa.local'],
  ['minh.tran@gmail.com', 'customer.two@demo.auraspa.local'],
  ['hoa.le@gmail.com', 'customer.three@demo.auraspa.local'],
  ['bao.pham@gmail.com', 'customer.four@demo.auraspa.local'],
  ['mai.hoang@gmail.com', 'customer.five@demo.auraspa.local'],
  ['lan.staff@aura-spa.com', 'tech.hcmq1.a@demo.auraspa.local'],
  ['long.pham@aura-spa.com', 'tech.hcmq1.b@demo.auraspa.local'],
  ['duc.nguyen@aura-spa.com', 'tech.hcmq7.a@demo.auraspa.local'],
  ['bich.tran@aura-spa.com', 'tech.hanhk.a@demo.auraspa.local'],
  ['an.nguyen.dn@aura-spa.com', 'tech.danhc.a@demo.auraspa.local'],
  ['thuy.le.dn@aura-spa.com', 'tech.danmk.a@demo.auraspa.local'],
  ['khoa.tran.dn@aura-spa.com', 'tech.dannhs.a@demo.auraspa.local'],
  ['huong.manager@aura-spa.com', 'manager.hcmq1@demo.auraspa.local'],
  ['khanh.manager@aura-spa.com', 'manager.hcmq7@demo.auraspa.local'],
  ['phuong.manager@aura-spa.com', 'manager.hanhk@demo.auraspa.local'],
  ['dung.manager.dn@aura-spa.com', 'manager.danhc@demo.auraspa.local'],
];

const USER_REFERENCE_COLUMNS = [
  ['bookings', 'customer_id'],
  ['bookings', 'technician_id'],
  ['complaints', 'assigned_to'],
  ['complaints', 'customer_id'],
  ['conversations', 'assigned_staff_id'],
  ['conversations', 'customer_id'],
  ['health_records', 'created_by'],
  ['health_records', 'customer_id'],
  ['health_records', 'updated_by'],
  ['inventory_transactions', 'created_by'],
  ['inventory_transactions', 'staff_id'],
  ['invoices', 'customer_id'],
  ['messages', 'sender_user_id'],
  ['payments', 'customer_id'],
  ['reviews', 'customer_id'],
  ['reviews', 'replied_by'],
  ['reviews', 'technician_id'],
  ['schedule_requests', 'reviewed_by'],
  ['schedule_requests', 'staff_id'],
  ['staff_schedules', 'created_by'],
  ['staff_schedules', 'staff_id'],
  ['strategies', 'created_by'],
  ['treatment_courses', 'customer_id'],
  ['treatment_sessions', 'staff_id'],
];

const CLEAN_SHIFT_REASON = 'clean-demo-account-shift';

const db = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'aura_spa',
});

function staffCodeFor(user) {
  const prefix = user.role === 'manager' ? 'MGR' : 'TECH';
  if (user.role === 'manager') return `${prefix}-CLEAN-${user.branchCode}`;

  const suffix = user.email
    .split('@')[0]
    .split('.')
    .pop()
    .toUpperCase();

  return `${prefix}-CLEAN-${user.branchCode}-${suffix}`;
}

async function upsertUser(user, passwordHash) {
  const result = await db.query(
    `
      INSERT INTO users (
        email, phone, password_hash, role, status, auth_provider, provider_user_id,
        full_name, avatar_url, gender, date_of_birth, address, last_login_at,
        failed_login_count, login_lock_until, is_active, notification_enabled
      )
      VALUES ($1, $2, $3, $4, 'active', 'email', NULL, $5, NULL, $6, NULL, NULL, NULL, 0, NULL, TRUE, TRUE)
      ON CONFLICT (email) DO UPDATE SET
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = 'active',
        auth_provider = 'email',
        full_name = EXCLUDED.full_name,
        gender = EXCLUDED.gender,
        failed_login_count = 0,
        login_lock_until = NULL,
        is_active = TRUE,
        notification_enabled = TRUE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email
    `,
    [user.email, user.phone, passwordHash, user.role, user.fullName, user.gender],
  );

  return result.rows[0];
}

async function upsertBranchAssignment(userId, user) {
  if (!user.branchCode) return;

  const branch = await db.query('SELECT id FROM branches WHERE code = $1', [user.branchCode]);
  if (branch.rowCount === 0) {
    throw new Error(`Branch not found: ${user.branchCode}`);
  }

  await db.query(
    `
      INSERT INTO branch_staff (branch_id, user_id, staff_code, position, status, start_date, end_date)
      VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE, NULL)
      ON CONFLICT (branch_id, user_id) DO UPDATE SET
        staff_code = EXCLUDED.staff_code,
        position = EXCLUDED.position,
        status = 'active',
        end_date = NULL,
        updated_at = CURRENT_TIMESTAMP
    `,
    [branch.rows[0].id, userId, staffCodeFor(user), user.role === 'manager' ? 'manager' : 'technician'],
  );
}

async function upsertDemoShift(userId, user) {
  if (user.role !== 'staff' || !user.branchCode) return;

  const branch = await db.query('SELECT id FROM branches WHERE code = $1', [user.branchCode]);
  if (branch.rowCount === 0) {
    throw new Error(`Branch not found: ${user.branchCode}`);
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 1, 0, 0));
  const end = new Date(start.getTime() + 120 * 24 * 60 * 60 * 1000);

  const existing = await db.query(
    `
      SELECT id FROM schedule_requests
      WHERE staff_id = $1
        AND branch_id = $2
        AND request_type = 'work_shift'
        AND reason = $3
      LIMIT 1
    `,
    [userId, branch.rows[0].id, CLEAN_SHIFT_REASON],
  );

  if (existing.rowCount > 0) {
    await db.query(
      `
        UPDATE schedule_requests
        SET requested_start = $1,
            requested_end = $2,
            status = 'approved',
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [start, end, existing.rows[0].id],
    );
    return;
  }

  await db.query(
    `
      INSERT INTO schedule_requests (
        staff_id, branch_id, request_type, requested_start, requested_end,
        status, reason, reviewed_by, reviewed_at
      )
      VALUES ($1, $2, 'work_shift', $3, $4, 'approved', $5, NULL, CURRENT_TIMESTAMP)
    `,
    [userId, branch.rows[0].id, start, end, CLEAN_SHIFT_REASON],
  );
}

async function cleanupLegacyAccounts() {
  const result = await db.query(
    `
      WITH legacy AS (
        SELECT id FROM users WHERE email = ANY($1::text[])
      ),
      updated_staff AS (
        UPDATE branch_staff
        SET status = 'inactive', end_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
        WHERE user_id IN (SELECT id FROM legacy)
        RETURNING id
      )
      UPDATE users
      SET status = 'suspended', is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (SELECT id FROM legacy)
      RETURNING email
    `,
    [LEGACY_SEED_EMAILS],
  );

  return result.rows.map(row => row.email);
}

async function migrateLegacyReferences() {
  const values = LEGACY_USER_MAPPINGS.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ');
  const params = LEGACY_USER_MAPPINGS.flat();
  let updated = 0;

  await db.query(`CREATE TEMP TABLE clean_user_map (old_id bigint PRIMARY KEY, new_id bigint NOT NULL) ON COMMIT DROP`);
  await db.query(
    `
      INSERT INTO clean_user_map (old_id, new_id)
      SELECT old_user.id, new_user.id
      FROM (VALUES ${values}) AS m(old_email, new_email)
      JOIN users old_user ON old_user.email = m.old_email
      JOIN users new_user ON new_user.email = m.new_email
    `,
    params,
  );

  for (const [table, column] of USER_REFERENCE_COLUMNS) {
    const result = await db.query(
      `
        UPDATE ${table} target
        SET ${column} = clean_user_map.new_id
        FROM clean_user_map
        WHERE target.${column} = clean_user_map.old_id
      `,
    );
    updated += result.rowCount;
  }

  return updated;
}

async function main() {
  await db.connect();
  await db.query('BEGIN');

  try {
    const hashes = {
      owner: await bcrypt.hash(PASSWORDS.owner, 12),
      manager: await bcrypt.hash(PASSWORDS.manager, 12),
      staff: await bcrypt.hash(PASSWORDS.staff, 12),
      customer: await bcrypt.hash(PASSWORDS.customer, 12),
    };

    for (const user of USERS) {
      const saved = await upsertUser(user, hashes[user.role]);
      await upsertBranchAssignment(saved.id, user);
      await upsertDemoShift(saved.id, user);
    }

    let cleaned = [];
    let migrated = 0;
    if (CLEANUP_LEGACY) {
      migrated = await migrateLegacyReferences();
      cleaned = await cleanupLegacyAccounts();
    }

    await db.query('COMMIT');

    console.log(`Seeded clean demo accounts: ${USERS.length}`);
    console.log(`Legacy references migrated: ${migrated}`);
    console.log(`Legacy cleanup: ${CLEANUP_LEGACY ? `suspended ${cleaned.length} account(s)` : 'skipped'}`);
    console.log('');
    console.log('Passwords: owner=Owner123!, manager=Manager123!, staff=Staff123!, customer=Customer123!');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    await db.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
