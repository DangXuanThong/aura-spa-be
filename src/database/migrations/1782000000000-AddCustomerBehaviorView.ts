import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerBehaviorView1782000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_behavior AS
      SELECT
        b.customer_id                                                          AS customer_id,
        COUNT(b.id)                                                            AS total_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'completed')                     AS completed_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'cancelled')                     AS cancelled_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'no_show')                       AS no_show_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.subtotal_amount - b.discount_amount ELSE 0 END), 0)
                                                                               AS total_spent,
        COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.subtotal_amount - b.discount_amount END), 0)
                                                                               AS avg_order_value,
        COUNT(DISTINCT b.branch_id)                                            AS unique_branches_visited,
        MIN(b.created_at)                                                      AS first_booking_at,
        MAX(b.created_at)                                                      AS last_booking_at,
        COALESCE(
          EXTRACT(DAY FROM (MAX(b.created_at) - MIN(b.created_at)))::int / NULLIF(COUNT(b.id) - 1, 0),
          0
        )                                                                      AS avg_days_between_bookings,
        ROUND(
          COUNT(b.id) FILTER (WHERE b.status = 'completed')::numeric /
          NULLIF(COUNT(b.id), 0) * 100,
          1
        )                                                                      AS completion_rate_pct
      FROM bookings b
      GROUP BY b.customer_id
      WITH DATA;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mv_customer_behavior_customer_id"
        ON mv_customer_behavior (customer_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS mv_customer_behavior;`);
  }
}
