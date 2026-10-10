const fs = require('fs');
const file = 'apps/web/app/admin/layout.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldBell = 'className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white shadow-xs relative transition-colors"';
const newBell = 'className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white transition-all shadow-2xs relative"';

const oldDot = 'className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"';
const newDot = 'className="absolute top-1 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.6)]"';

content = content.replace(oldBell, newBell);
content = content.replace(oldDot, newDot);

fs.writeFileSync(file, content);
