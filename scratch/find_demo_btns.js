
const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(full));
        } else {
            results.push(full);
        }
    });
    return results;
}

const allFiles = walk('/app/.next');
for (const f of allFiles) {
    if (f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.rsc')) {
        const c = fs.readFileSync(f, 'utf8');
        if (c.includes('Buka Dashboard Demo') || c.includes('Masuk ke Portal Member Sekarang') || c.includes('Masuk ke Dashboard Sekarang')) {
            console.log("MATCH:", f);
        }
    }
}
