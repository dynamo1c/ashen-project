const http = require('http');

console.log("\n==================================================");
console.log("ASHEN PROTOCOL - QUICKML FORECAST INTEGRATION");
console.log("==================================================\n");

console.log("[+] Connecting to local Catalyst server on port 3000...");

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/server/ashen_api/api/admin/integrate',
  method: 'GET',
  timeout: 60000
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`[-] Error: Server responded with status code ${res.statusCode}`);
      try {
        const errJson = JSON.parse(data);
        console.error(`[-] Details: ${errJson.error} - ${errJson.details || ''}`);
      } catch (e) {
        console.error(`[-] Response: ${data}`);
      }
      process.exit(1);
    }
    
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log("\n==========================================================================");
        console.log("INTEGRATION RUN SUMMARY REPORT");
        console.log("==========================================================================");
        console.log(String("District").padEnd(20) + " | " + String("Month").padEnd(10) + " | " + String("Forecast").padEnd(10) + " | " + String("Risk Level").padEnd(12) + " | " + String("DB Write Status"));
        console.log("-".repeat(74));
        
        result.report.forEach(row => {
          console.log(
            row.district.padEnd(20) + " | " + 
            row.month.padEnd(10) + " | " + 
            String(row.forecast).padEnd(10) + " | " + 
            row.risk.padEnd(12) + " | " + 
            row.status
          );
        });
        console.log("-".repeat(74));
        
        if (result.warning) {
          console.log(`\n[WARNING] ${result.warning}`);
        }
        
        console.log("\n==========================================================================");
        console.log(`Execution complete. Successful rows written: ${result.report.length} / 15.`);
        
        if (result.failures && result.failures.length > 0) {
          console.log(`[!] Failed integrations count: ${result.failures.length}`);
          result.failures.forEach(f => {
            console.log(`  * District: ${f.district}, Month: ${f.month} -> Error: ${f.error}`);
          });
        } else {
          console.log("[+] Zero failures encountered during integration run.");
        }
        console.log("==========================================================================\n");
      } else {
        console.error("[-] Integration failed:", result);
      }
    } catch (err) {
      console.error("[-] Failed to parse response from server:", err.message);
      console.error("[-] Raw response was:", data);
    }
  });
});

req.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.error("[-] ERROR: Connection refused on port 3000.");
    console.error("[-] Please ensure that your local Catalyst server is running first!");
  } else {
    console.error("[-] Request error:", err.message);
  }
  process.exit(1);
});

req.on('timeout', () => {
  console.error("[-] Request timed out after 60 seconds.");
  req.destroy();
  process.exit(1);
});

req.end();
