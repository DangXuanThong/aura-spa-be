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

  console.log('\n--- TESTING PATCH /bookings/4/assign-room ---');
  try {
    const res = await fetch(`${baseUrl}/bookings/4/assign-room`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ room: 'VIP 02' }),
    });
    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(`HTTP error! status: ${res.status}, body: ${JSON.stringify(errBody)}`);
    }
    const body = await res.json();
    console.log('API Response:', body);
  } catch (e) {
    console.error('Assign Room Failed:', e.message);
  }
}

test().catch(console.error);
