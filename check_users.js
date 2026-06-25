const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/aura_spa',
  });
  await client.connect();
  const res = await client.query("SELECT id, email, role, full_name, status FROM users");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
