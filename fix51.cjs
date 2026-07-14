const fs = require('fs');
let lines = fs.readFileSync('App.tsx', 'utf-8').split('\n');

// 3751 is index 3750, 3752 is index 3751
if (lines[3750].trim() === '}') {
    lines[3750] = lines[3750].replace('}', ')}');
}

fs.writeFileSync('App.tsx', lines.join('\n'));
console.log('Fixed line 3751');
