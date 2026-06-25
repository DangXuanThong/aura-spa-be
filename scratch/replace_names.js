const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '../src/database/seeds/seed-data.ts'),
  path.join(__dirname, '../src/database/seeds/performance-data.seeder.ts'),
  path.join(__dirname, '../src/database/seeds/booking.seeder.ts'),
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`File does not exist: ${file}`);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace email
  const oldEmail = 'thu.vo@aura-spa.com';
  const newEmail = 'lan.staff@aura-spa.com';
  content = content.split(oldEmail).join(newEmail);
  
  // Replace name
  const oldName1 = 'Vo Thi Thu';
  const newName = 'Nguyễn Thị Lan';
  content = content.split(oldName1).join(newName);

  // Replace name variants if any
  content = content.split('Võ Thị Thu').join(newName);

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated file: ${file}`);
}
