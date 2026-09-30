
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

const targets = [
    '/app/.next/server/app/index.html',
    '/app/.next/server/app/index.rsc',
    '/app/.next/server/app/index.segments/__PAGE__.segment.rsc',
    '/app/.next/server/app/index.segments/_full.segment.rsc',
    '/app/.next/static/chunks/1_33gu1iy64hp.js',
    '/app/.next/static/chunks/1xmxa-toypd5m.js',
];

const allFiles = walk('/app/.next');

let modified = 0;
allFiles.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.rsc') || file.endsWith('.json')) {
        try {
            let content = fs.readFileSync(file, 'utf8');
            let orig = content;

            // Remove Portal Agen link and text
            content = content.replace(/<a[^>]*href="\/agent\/login"[^>]*>[\s\S]*?Portal Agen[\s\S]*?<\/a>/gi, '');
            content = content.replace(/Portal Agen/g, '');
            content = content.replace(/"\/agent\/login"/g, '"#"');

            if (content !== orig) {
                fs.writeFileSync(file, content, 'utf8');
                modified++;
            }
        } catch(e) {}
    }
});

console.log(`Successfully cleaned Portal Agen from ${modified} files in container!`);
