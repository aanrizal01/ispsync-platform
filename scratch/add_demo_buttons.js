
const fs = require('fs');

const heroBtnHtml = '<a class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-cyan-500/20 transition-all transform hover:scale-105" href="https://cms.ispku.ispsync.id"><span>Buka Dashboard Demo</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right w-5 h-5" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a>';

const bottomBtnHtml = '<a class="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base px-8 py-3.5 rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-105" href="https://cms.ispku.ispsync.id"><span>Masuk ke Dashboard Demo Sekarang</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right w-5 h-5" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a>';

// 1. Update index.html
let html = fs.readFileSync('/app/.next/server/app/index.html', 'utf8');

// Insert Hero button if missing before WhatsApp link
if (!html.includes('href="https://cms.ispku.ispsync.id"><span>Buka Dashboard Demo</span>')) {
    html = html.replace(
        '<div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"><a href="https://wa.me/',
        '<div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">' + heroBtnHtml + '<a href="https://wa.me/'
    );
}

// Replace bottom button
html = html.replace(
    /<a[^>]*href="[^"]*"[^>]*><span>(?:Masuk ke Portal Member Sekarang|Masuk ke Dashboard Sekarang|Buka Demo Tenant ISPKU|Buka Dashboard Demo Sekarang)<\/span>[\s\S]*?<\/a>/g,
    bottomBtnHtml
);

fs.writeFileSync('/app/.next/server/app/index.html', html, 'utf8');
console.log("index.html updated successfully!");
