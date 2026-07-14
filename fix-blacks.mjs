import fs from 'fs';

const files = ['App.tsx', 'src/components/LandingPage.tsx'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Fix duplicates
  content = content.replace(/text-black\s+text-black/g, 'text-black');
  
  // Fix dark:text-black to dark:text-white
  content = content.replace(/dark:text-black/g, 'dark:text-white');

  // bg-zinc-700 text-black should probably be text-white
  content = content.replace(/bg-zinc-700 text-black/g, 'bg-zinc-700 text-white');
  content = content.replace(/hover:bg-zinc-700 text-black/g, 'hover:bg-zinc-700 text-white');

  // Let's also make sure buttons that use bg-white text-black hover properly 
  content = content.replace(/hover:bg-white text-black/g, 'hover:bg-zinc-200 text-black');

  // Any text-black inside a dark context might be wrong. Let's see some specific replacements
  content = content.replace(/flexitems-centergap-2bg-whitetext-blackpx-4py-2roundedtext-smfont-boldhover:bg-zinct-200text-blacktransition/g, 'flex items-center gap-2 bg-white text-black px-4 py-2 rounded text-sm font-bold hover:bg-zinc-200 transition');

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed');
