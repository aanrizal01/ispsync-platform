
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
let count = 0;

allFiles.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.rsc')) {
        try {
            let content = fs.readFileSync(file, 'utf8');
            let orig = content;

            // Pattern 1: HTML anchor tag
            content = content.replace(/<div class="mt-5 pt-5 border-t border-slate-100 text-center">[\s\S]*?href="\/billing\/check"[\s\S]*?<\/div>/g, '');
            content = content.replace(/<a[^>]*href="\/billing\/check"[^>]*>[\s\S]*?<\/a>/g, '');

            // Pattern 2: React JSX / JS chunks
            content = content.replace(/href:"\/billing\/check"[^}]*className:"[^"]*bg-blue-50[^"]*"/g, 'className:"hidden"');
            content = content.replace(/"💳[\s]*"/g, '""');
            content = content.replace(/\uD83D\uDCB3/g, '');

            if (content !== orig) {
                fs.writeFileSync(file, content, 'utf8');
                count++;
            }
        } catch(e) {}
    }
});
console.log(`Cleaned payment button from ${count} files.`);
