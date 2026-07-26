const http = require('http');
const app = require('./functions/ashen_api/index.js');

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`[TEST] Internal test server listening on port ${port}`);

  const endpoints = [
    '/api/analytics/summary',
    '/api/map/hotspots?district=all',
    '/api/predict/risk',
    '/api/network/graph?fir_number=KA-BGU-2023-000002',
    '/api/analytics/anomalies'
  ];

  for (const ep of endpoints) {
    await new Promise((resolve) => {
      http.get(`http://localhost:${port}${ep}`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`[TEST] GET ${ep} -> Status: ${res.statusCode}`);
          try {
            const data = JSON.parse(body);
            if (Array.isArray(data)) {
              console.log(`  Array Result Count: ${data.length}`);
            } else {
              console.log(`  Object Keys: ${Object.keys(data).join(', ')}`);
            }
          } catch(e) {
            console.log(`  Raw Response: ${body.substring(0, 100)}`);
          }
          resolve();
        });
      }).on('error', (err) => {
        console.error(`[TEST] GET ${ep} Error:`, err.message);
        resolve();
      });
    });
  }

  server.close(() => {
    console.log('[TEST] Internal test server closed. All checks complete!');
    process.exit(0);
  });
});
