const fs = require('fs');
let lines = fs.readFileSync('mentoria-individual/GestaoVIPPanel.tsx', 'utf-8').split('\n');

// Line 343 is lines[342]
lines[342] = lines[342].replace('</div></div>', '');

fs.writeFileSync('mentoria-individual/GestaoVIPPanel.tsx', lines.join('\n'));
console.log('Fixed GestaoVIPPanel.tsx');
