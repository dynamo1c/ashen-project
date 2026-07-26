const { execSync } = require('child_process');
try {
  console.log("--- Git status ---");
  console.log(execSync('git status').toString());
  console.log("--- Git Log of index.js changes ---");
  console.log(execSync('git log -p -n 3 functions/ashen_api/index.js').toString());
} catch (e) {
  console.error(e.message);
}
