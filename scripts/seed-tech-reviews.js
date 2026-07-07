const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@0.0.0.0:5432/aura_spa",
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL.");

    // 1. Get all active technicians
    const techsRes = await client.query(
      `SELECT bs.branch_id, bs.user_id, u.full_name
       FROM branch_staff bs
       JOIN users u ON bs.user_id = u.id
       WHERE bs.position = 'technician' AND bs.status = 'active'`
    );
    const techs = techsRes.rows;
    console.log(`Found ${techs.length} active technicians.`);

    // Get a customer user to make bookings
    const custRes = await client.query("SELECT id FROM users WHERE role = 'customer' LIMIT 1");
    const customerId = custRes.rows[0].id;

    // Get a service to link
    const svcRes = await client.query("SELECT id FROM services LIMIT 1");
    const serviceId = svcRes.rows[0].id;

    for (const tech of techs) {
      // Check if they already have reviews
      const reviewCheck = await client.query("SELECT COUNT(*) FROM reviews WHERE technician_id = $1", [tech.user_id]);
      const reviewCount = parseInt(reviewCheck.rows[0].count);
      
      if (reviewCount > 0) {
        console.log(`Skipping ${tech.full_name} (already has ${reviewCount} reviews).`);
        continue;
      }

      console.log(`Seeding reviews for ${tech.full_name} (Branch: ${tech.branch_id})...`);

      // Generate a set of realistic ratings
      const seedRatings = [
        [5, 4, 5],
        [4, 5, 4],
        [5, 5, 5],
        [4, 4, 5],
        [5, 5, 4]
      ][tech.user_id % 5];

      for (let i = 0; i < seedRatings.length; i++) {
        const rating = seedRatings[i];
        
        // 1. Insert a completed booking
        const bookingRes = await client.query(
          `INSERT INTO bookings (customer_id, branch_id, technician_id, start_time, end_time, status, source, subtotal_amount, discount_amount, deposit_required_amount, paid_amount, remaining_amount, created_at, updated_at)
           VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', 'completed', 'online', 100000, 0, 0, 100000, 0, NOW(), NOW()) RETURNING id`,
          [customerId, tech.branch_id, tech.user_id]
        );
        const bookingId = bookingRes.rows[0].id;

        // 2. Insert the corresponding review
        const comment = [
          "Dịch vụ rất tốt, nhân viên thân thiện chu đáo!",
          "Kỹ thuật viên tay nghề cao, làm rất êm ái.",
          "Rất hài lòng với chất lượng phục vụ tại đây.",
          "Nhân viên làm nhiệt tình, chu đáo sạch sẽ.",
          "Tuyệt vời, sẽ quay lại lần sau!"
        ][(tech.user_id + i) % 5];

        await client.query(
          `INSERT INTO reviews (customer_id, booking_id, branch_id, service_id, technician_id, rating, comment, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', NOW(), NOW())`,
          [customerId, bookingId, tech.branch_id, serviceId, tech.user_id, rating, comment]
        );
      }
      console.log(`  - Seeded ${seedRatings.length} reviews for ${tech.full_name}.`);
    }

    console.log("✓ Seeding reviews completed successfully!");

  } catch (err) {
    console.error("Error seeding reviews:", err);
  } finally {
    await client.end();
  }
}

run();
