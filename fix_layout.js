const fs = require('fs');
const file = 'apps/web/app/admin/layout.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/<Link[\s\S]*?href="\/admin\/users"[\s\S]*?Pengguna \/ Staf[\s\S]*?<\/Link>/, '');
content = content.replace('Peran & Hak Akses', 'Manajemen Staf & Akses');
content = content.replace('href="/admin/roles"', 'href="/admin/users"');
fs.writeFileSync(file, content);
