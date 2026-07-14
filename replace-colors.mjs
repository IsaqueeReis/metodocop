import fs from 'fs';

const files = ['App.tsx', 'src/components/LandingPage.tsx'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Background and buttons
  content = content.replace(/bg-red-600/g, 'bg-white');
  content = content.replace(/hover:bg-red-700/g, 'hover:bg-zinc-200');
  content = content.replace(/bg-red-500/g, 'bg-white');
  
  // Need to make sure text is black for white backgrounds specifically where text-white was used:
  // e.g. "bg-white hover:bg-zinc-200 text-white" -> "bg-white hover:bg-zinc-200 text-black"
  content = content.replace(/bg-white([^"]*)text-white/g, 'bg-white$1text-black');
  content = content.replace(/bg-white([^']*)text-white/g, 'bg-white$1text-black');
  
  // Text colors
  content = content.replace(/text-red-600/g, 'text-white');
  content = content.replace(/text-red-500/g, 'text-zinc-300');
  content = content.replace(/text-red-400/g, 'text-zinc-400');
  
  // Hover text
  content = content.replace(/hover:text-red-600/g, 'hover:text-white');
  content = content.replace(/hover:text-red-500/g, 'hover:text-white');
  
  // Borders
  content = content.replace(/border-red-600/g, 'border-white');
  content = content.replace(/border-red-500/g, 'border-white');
  content = content.replace(/hover:border-red-500\/50/g, 'hover:border-white/50');
  content = content.replace(/hover:border-red-500\/30/g, 'hover:border-white/30');
  content = content.replace(/hover:border-red-600/g, 'hover:border-white');

  // Rings
  content = content.replace(/focus:ring-red-600/g, 'focus:ring-white');
  
  // Gradients
  content = content.replace(/from-red-500 to-red-800/g, 'from-white to-zinc-500');
  
  // Shadows (Tailwind)
  content = content.replace(/shadow-red-600\/50/g, 'shadow-white/20');
  content = content.replace(/shadow-red-900\/20/g, 'shadow-white/10');
  
  // Custom Shadows RGBA
  content = content.replace(/rgba\(220,38,38,/g, 'rgba(255,255,255,'); 
  
  // Accents and Backgrounds with opacity
  content = content.replace(/bg-red-600\/10/g, 'bg-white/10');
  content = content.replace(/bg-red-600\/20/g, 'bg-white/20');
  content = content.replace(/bg-red-50\/50/g, 'bg-zinc-800/50');
  content = content.replace(/bg-red-900\/10/g, 'bg-zinc-800/50');
  content = content.replace(/bg-red-900\/30/g, 'bg-zinc-800/50');
  content = content.replace(/bg-red-900\/50/g, 'bg-zinc-800/80');
  content = content.replace(/bg-red-900\/80/g, 'bg-zinc-800');
  content = content.replace(/bg-red-500\/10/g, 'bg-white/10');

  // Border opacities
  content = content.replace(/border-red-900\/50/g, 'border-zinc-700/50');
  content = content.replace(/border-red-900/g, 'border-zinc-700');

  // Errors / Success specific boxes:
  content = content.replace(/bg-red-50 /g, 'bg-zinc-900 ');
  content = content.replace(/border-red-200/g, 'border-zinc-700');

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Colors replaced successfully');
