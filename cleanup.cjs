const fs = require('fs');

let c = fs.readFileSync('mentoria-individual/StudentPanel.tsx', 'utf8');

c = c.replace(/bg-zinc-900\/50 backdrop-blur-xl/g, 'bg-black/40 backdrop-blur-xl');
c = c.replace(/bg-zinc-800 rounded-xl/g, 'bg-black/40 backdrop-blur-md border border-white/10 rounded-xl');
c = c.replace(/bg-zinc-950 rounded-full/g, 'bg-black/60 backdrop-blur-md rounded-full shadow-inner');
c = c.replace(/border-zinc-800/g, 'border-white/5');
c = c.replace(/border-zinc-700/g, 'border-white/10');
c = c.replace(/bg-zinc-700 rounded-full/g, 'bg-white/10 rounded-full border border-white/20');
c = c.replace(/bg-zinc-900\/50 backdrop-blur-md/g, 'bg-black/40 backdrop-blur-md');

fs.writeFileSync('mentoria-individual/StudentPanel.tsx', c);
