const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');
const lines = code.split('\n');

for(let end=1690; end<=1900; end+=1) {
  const chunk = lines.slice(0, end).join('\n');
  const b = (chunk.match(/`/g) || []).length;
  if (b % 2 !== 0) {
    console.log('Unclosed backtick at line', end);
    break;
  }
}
