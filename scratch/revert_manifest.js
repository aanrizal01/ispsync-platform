
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
            content = content.split("https://cms.ispku.ispsync.id").join("/billing/check");
            if (content !== orig) {
                fs.writeFileSync(file, content, 'utf8');
                count++;
            }
        } catch(e) {}
    }
});
console.log(`Reverted manifest route in ${count} files.`);
