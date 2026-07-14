const fs = require('fs');
const file = 'mentoria-individual/AdminPanel.tsx';
let lines = fs.readFileSync(file, 'utf-8').split('\n');

if (lines[1031].includes('});')) {
    lines[1031] = lines[1031].replace('});', '};');
    lines[1032] = '';
}
if (lines[1294].includes('});')) {
    lines[1294] = lines[1294].replace('});', '};');
    lines[1295] = '';
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed AdminPanel.tsx 1032 and 1295');
