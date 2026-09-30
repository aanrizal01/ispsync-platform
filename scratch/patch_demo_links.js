
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

let count = 0;
const allFiles = walk('/app/.next');
allFiles.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.rsc') || file.endsWith('.json')) {
        try {
            let content = fs.readFileSync(file, 'utf8');
            let orig = content;

            content = content.replace(
                'href="/login"><span>Buka Dashboard Demo</span>',
                'href="https://cms.ispku.ispsync.id"><span>Buka Demo Tenant (ISPKU)</span>'
            );
            content = content.replace(
                'href="/login" class="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600',
                'href="https://cms.ispku.ispsync.id" class="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600'
            );
            content = content.replace('Masuk ke Dashboard Sekarang', 'Buka Demo Tenant ISPKU');

            if (content !== orig) {
                fs.writeFileSync(file, content, 'utf8');
                count++;
            }
        } catch(e) {}
    }
});
console.log(`Updated ${count} files for demo tenant links.`);
