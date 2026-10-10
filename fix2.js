const fs = require('fs');
const file = 'apps/web/app/admin/network/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/if \(networkTab === " routers\\\)/, 'if (networkTab === "routers")');
fs.writeFileSync(file, content);
