
const fs = require('fs');

const html = fs.readFileSync('/app/.next/server/app/index.html', 'utf8');

// Find all <a> tags with href="/login" or demo
const regex = /<a[^>]*href="[^"]*"[^>]*>[\s\S]*?<\/a>/g;
let match;
while ((match = regex.exec(html)) !== null) {
    if (match[0].includes('Demo') || match[0].includes('Dashboard') || match[0].includes('Portal Member')) {
        console.log("FOUND LINK:", match[0].replace(/<svg[\s\S]*?<\/svg>/g, '<svg>'));
    }
}
