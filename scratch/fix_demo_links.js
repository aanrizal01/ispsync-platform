
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
let modified = 0;

allFiles.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.rsc') || file.endsWith('.json')) {
        try {
            let content = fs.readFileSync(file, 'utf8');
            let orig = content;

            // 1. Hero Button: make sure href is https://cms.ispku.ispsync.id
            content = content.replace(
                /<a[^>]*><span>Buka Dashboard Demo<\/span>[\s\S]*?<\/a>/g,
                '<a class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-cyan-500/20 transition-all transform hover:scale-105" href="https://cms.ispku.ispsync.id"><span>Buka Dashboard Demo</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right w-5 h-5" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a>'
            );

            // 2. Demo Card Button: make sure href is https://cms.ispku.ispsync.id
            content = content.replace(
                /<a[^>]*href="\/login"[^>]*><span>(?:Masuk ke Portal Member Sekarang|Masuk ke Dashboard Sekarang|Buka Demo Tenant ISPKU)<\/span>[\s\S]*?<\/a>/g,
                '<a class="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base px-8 py-3.5 rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-105" href="https://cms.ispku.ispsync.id"><span>Buka Dashboard Demo Sekarang</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right w-5 h-5" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a>'
            );

            // In RSC JSON chunks
            content = content.replace(
                /"href":"\/login","className":"[^"]*","children":\["Buka Demo Tenant ISPKU"/g,
                '"href":"https://cms.ispku.ispsync.id","className":"inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base px-8 py-3.5 rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-105","children":["Buka Dashboard Demo Sekarang"'
            );

            // Replace plain text button
            content = content.replace(
                'Masuk ke Portal Member Sekarang',
                'Buka Dashboard Demo Sekarang'
            );

            if (content !== orig) {
                fs.writeFileSync(file, content, 'utf8');
                modified++;
            }
        } catch(e) {}
    }
});

console.log(`Updated ${modified} files with direct demo links to https://cms.ispku.ispsync.id!`);
