const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf-8');

// Replace common JSX tags with newlines to expand the huge lines
content = content.replace(/(<\/?div|<\/?button|<\/?span|<\/?p|<\/?h3|<\/?h4|<\/?h2)/g, '\n$1');

fs.writeFileSync('App.tsx', content);
console.log('Formatted App.tsx to break huge lines');
