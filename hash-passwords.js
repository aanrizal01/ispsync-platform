const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getMembersPath() {
  const p0 = path.join(process.cwd(), 'data', 'members.json');
  if (fs.existsSync(p0)) return p0;
  const p1 = path.join(process.cwd(), 'apps', 'web', 'data', 'members.json');
  if (fs.existsSync(p1)) return p1;
  return p0;
}

const MEMBERS_PATH = getMembersPath();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "ispsync_salt").digest("hex");
}

function migrate() {
  if (!fs.existsSync(MEMBERS_PATH)) {
    console.error('members.json not found at ' + MEMBERS_PATH);
    return;
  }

  const raw = fs.readFileSync(MEMBERS_PATH, 'utf-8');
  const data = JSON.parse(raw);
  
  let modified = 0;
  for (const member of data.members || []) {
    // Basic check: if it's already 64 chars hex, assume it's hashed
    if (member.password && (member.password.length !== 64 || !/^[a-f0-9]{64}$/i.test(member.password))) {
      member.password = hashPassword(member.password);
      modified++;
    }
  }

  if (modified > 0) {
    fs.writeFileSync(MEMBERS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully hashed ${modified} passwords in members.json`);
  } else {
    console.log('No plaintext passwords found to hash.');
  }
}

migrate();
