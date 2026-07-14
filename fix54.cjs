const fs = require('fs');
const file = 'mentoria-individual/AdminPanel.tsx';
let lines = fs.readFileSync(file, 'utf-8').split('\n');

// We want to keep from index 0 to 1033 (which is line 1034)
// And from index 1565 (which is line 1566) to the end.
const newLines = [];
for (let i = 0; i < lines.length; i++) {
    if (i <= 1033) {
        newLines.push(lines[i]);
    } else if (i >= 1565) {
        newLines.push(lines[i]);
    }
}

fs.writeFileSync(file, newLines.join('\n'));
console.log('Duplicates removed from AdminPanel.tsx');
