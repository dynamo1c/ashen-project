const https = require('https');

const apiKey = process.env.GEMINI_API_KEY || 'your_api_key_here';
const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const payload = {
  contents: [{
    parts: [{ text: 'Hello, respond with exactly "Gemini API Working!" if you can read this.' }]
  }]
};

const headers = {
  'Content-Type': 'application/json',
  'x-goog-api-key': apiKey
};

const parsedUrl = new URL(url);

const options = {
  method: 'POST',
  hostname: parsedUrl.hostname,
  path: parsedUrl.pathname + parsedUrl.search,
  headers: headers
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw Data:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request Error:', err);
});

req.write(JSON.stringify(payload));
req.end();
