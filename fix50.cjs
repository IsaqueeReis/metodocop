const fs = require('fs');
let lines = fs.readFileSync('App.tsx', 'utf-8').split('\n');

if (lines[3749].includes('}')) {
    lines[3749] = lines[3749].replace('}', ')}');
}

fs.writeFileSync('App.tsx', lines.join('\n'));
console.log('Fixed line 3750');
