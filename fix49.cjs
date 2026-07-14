const fs = require('fs');
let lines = fs.readFileSync('App.tsx', 'utf-8').split('\n');

if (lines[3750].includes('</div>))}')) {
    lines[3750] = lines[3750].replace('</div>))}', '}\n</div>)}');
}

fs.writeFileSync('App.tsx', lines.join('\n'));
console.log('Fixed line 3751');
