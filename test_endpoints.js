async function test() {
  const baseUrl = 'http://localhost:3100';

  console.log('--- LOGGING IN AS MANAGER ---');
  let managerToken;
  try {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'huong.manager@aura-spa.com',
        password: 'Manager123!',
      }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const body = await res.json();
    managerToken = body.data.accessToken;
    console.log('Manager Login Success! Token acquired.');
  } catch (e) {
    console.error('Manager Login Failed:', e.message);
    return;
  }

  console.log('\n--- TESTING GET /reports/manager-dashboard/1 ---');
  try {
    const res = await fetch(`${baseUrl}/reports/manager-dashboard/1`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const body = await res.json();
    console.log('Manager Dashboard Stats:', body);
  } catch (e) {
    console.error('Manager Dashboard Failed:', e.message);
  }

  console.log('\n--- TESTING GET /schedule-requests/active-staff/1 (as manager) ---');
  try {
    const res = await fetch(`${baseUrl}/schedule-requests/active-staff/1`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const body = await res.json();
    console.log('Active staff at Branch 1 (manager query):', body);
  } catch (e) {
    console.error('Active staff query failed:', e.message);
  }

  console.log('\n--- LOGGING IN AS OWNER ---');
  let ownerToken;
  try {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@gmail.com',
        password: '12345678qwerty',
      }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const body = await res.json();
    ownerToken = body.data.accessToken;
    console.log('Owner Login Success! Token acquired.');
  } catch (e) {
    console.error('Owner Login Failed:', e.message);
    return;
  }

  console.log('\n--- TESTING GET /schedule-requests/active-staff/all (as owner) ---');
  try {
    const res = await fetch(`${baseUrl}/schedule-requests/active-staff/all`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const body = await res.json();
    console.log('All Active Staff on Shift (owner query):', body);
  } catch (e) {
    console.error('Owner query failed:', e.message);
  }
}

test().catch(console.error);
