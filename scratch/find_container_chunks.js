
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

const files = walk('/app/.next');
for (const f of files) {
    if (f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.rsc')) {
        const c = fs.readFileSync(f, 'utf8');
        if (c.includes('GOGIGA') || c.includes('Satu Panel') || c.includes('MEDIA TEKNOLOGI')) {
            console.log("CONTAINER CHUNK MATCH:", f);
        }
    }
}
