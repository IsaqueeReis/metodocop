import fs from 'fs';

const files = ['App.tsx'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/group-hover:text-black/g, 'group-hover:text-zinc-900 dark:group-hover:text-zinc-300');
  content = content.replace(/<h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">/g, '<h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-4 flex items-center gap-2">');

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed more blacks');
