const fs = require('fs');
const lines = fs.readFileSync('App.tsx', 'utf-8').split('\n');
let p = 0;
let t = 0;
for (let i=0; i<1875; i++) {
  let line = lines[i];
  for(let c of line) {
    if (c === '(') p++;
    if (c === ')') p--;
    if (c === '`') t++;
  }
}
console.log('Parens:', p, 'Ticks:', t);
