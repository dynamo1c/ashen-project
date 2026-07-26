const { execSync } = require('child_process');
const path = require('path');
const rootDir = path.join(__dirname, '..', '..');

try {
  console.log("--- Git status ---");
  console.log(execSync('git status', { cwd: rootDir }).toString());
  console.log("--- Git Log of index.js changes ---");
  console.log(execSync('git log -p -n 3 functions/ashen_api/index.js', { cwd: rootDir }).toString());
} catch (e) {
  console.error(e.message);
}
