const fs = require('fs');
const content = fs.readFileSync('functions/ashen_api/index.js', 'utf8');
const lines = content.split('\n');
console.log(`Total lines: ${lines.length}`);
lines.forEach((line, i) => {
  if (line.match(/app\.(get|post|put|delete|use)\s*\(/)) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
