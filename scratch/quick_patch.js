
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

const terms = [
    ['ISP &amp; FTTH', 'Layanan Akun'],
    ['ISP & FTTH', 'Layanan Akun'],
    ['PORTAL MEMBER & LAYANAN', 'PORTAL MEMBER'],
    ['Pusat Kendali', 'Kelola Langganan'],
];

const allFiles = walk('/app/.next');
allFiles.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.rsc')) {
        try {
            let content = fs.readFileSync(file, 'utf8');
            let orig = content;
            for (const [from, to] of terms) {
                if (content.includes(from)) {
                    content = content.split(from).join(to);
                }
            }
            if (content !== orig) {
                fs.writeFileSync(file, content, 'utf8');
            }
        } catch(e) {}
    }
});
