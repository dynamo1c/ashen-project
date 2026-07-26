const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', '..', 'functions', 'ashen_api', 'index.js');
const content = fs.readFileSync(target, 'utf8');
const lines = content.split('\n');
console.log(`Total lines: ${lines.length}`);
lines.forEach((line, i) => {
  if (line.match(/app\.(get|post|put|delete|use)\s*\(/)) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
