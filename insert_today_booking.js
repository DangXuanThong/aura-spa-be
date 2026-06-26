const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/aura_spa',
  });
  await client.connect();

  // Find customer ID
  const custRes = await client.query("SELECT id FROM users WHERE email = 'lan.nguyen@gmail.com'");
  const customerId = custRes.rows[0]?.id;

  // Find branch ID
  const branchRes = await client.query("SELECT id FROM branches WHERE code = 'HCM-Q1'");
  const branchId = branchRes.rows[0]?.id;

  // Find technician ID
  const techRes = await client.query("SELECT id FROM users WHERE email = 'lan.staff@aura-spa.com'");
  const technicianId = techRes.rows[0]?.id;

  // Find service ID
  const serviceRes = await client.query("SELECT id FROM services WHERE code = 'SVC-FACIAL-001'");
  const serviceId = serviceRes.rows[0]?.id;

  if (!customerId || !branchId || !technicianId || !serviceId) {
    console.error('Missing records in database. Ensure seeder is run.', {
      customerId,
      branchId,
      technicianId,
      serviceId,
    });
    await client.end();
    return;
  }

  // Insert booking
  const startTime = new Date('2026-06-26T10:00:00+07:00');
  const endTime = new Date('2026-06-26T11:00:00+07:00');

  const bookingRes = await client.query(`
    INSERT INTO bookings (
      customer_id, branch_id, technician_id, start_time, end_time,
      status, source, subtotal_amount, discount_amount, deposit_required_amount,
      paid_amount, remaining_amount, created_by, room, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      'confirmed', 'online', 350000, 0, 0,
      0, 350000, $1, 'Chưa phân phòng', NOW(), NOW()
    ) RETURNING id
  `, [customerId, branchId, technicianId, startTime, endTime]);

  const bookingId = bookingRes.rows[0].id;

  // Insert booking service
  await client.query(`
    INSERT INTO booking_services (
      booking_id, service_id, quantity, duration_minutes, unit_price,
      discount_amount, final_amount
    ) VALUES (
      $1, $2, 1, 60, 350000,
      0, 350000
    )
  `, [bookingId, serviceId]);

  console.log('Successfully inserted booking for today (2026-06-26) with ID today-booking-01');

  await client.end();
}

main().catch(console.error);
