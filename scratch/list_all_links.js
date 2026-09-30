
const fs = require('fs');

const html = fs.readFileSync('/app/.next/server/app/index.html', 'utf8');

const regex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
let match;
while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    console.log("HREF:", match[1], "--> TEXT:", repr = text.substring(0, 50));
}
