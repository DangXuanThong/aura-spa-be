const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/aura_spa',
  });
  await client.connect();
  const res = await client.query('SELECT bs.*, u."fullName", u.email, u.phone FROM branch_staff bs JOIN "user" u ON bs.user_id = u.id');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
