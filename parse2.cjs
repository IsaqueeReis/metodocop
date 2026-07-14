const parser = require('@babel/parser');
const fs = require('fs');
const lines = fs.readFileSync('App.tsx', 'utf-8').split('\n');
const chunk = lines.slice(1847, 1875).join('\n'); // checkAchievements
console.log(chunk);
try {
  parser.parse(chunk, { plugins: ['typescript', 'jsx'], sourceType: 'module' });
  console.log('Success');
} catch (e) {
  console.log('Error in chunk:', e.message);
}
