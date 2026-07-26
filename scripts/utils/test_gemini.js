const https = require('https');
const { URL } = require('url');

const apiKey = process.env.GEMINI_API_KEY || "your_api_key_here";
const modelName = "gemini-2.5-flash";

function callGemini(payload) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    };
    const parsedUrl = new URL(url);
    const options = {
      method: 'POST',
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error ? parsed.error.message : `HTTP status ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function run() {
  const payload = {
    contents: [
      { role: 'user', parts: [{ text: "What is the current risk score in Bengaluru Urban and what is the latest news about crime there?" }] }
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: "get_district_risk_score",
            description: "Retrieve the current statistical and ARIMA-forecasted risk score for a specific district.",
            parameters: {
              type: "OBJECT",
              properties: {
                district: {
                  type: "STRING",
                  description: "The name of the district (e.g. Bengaluru Urban, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi)."
                }
              },
              required: ["district"]
            }
          }
        ]
      },
      {
        googleSearch: {}
      }
    ]
  };

  try {
    console.log("Sending request to Gemini...");
    const res = await callGemini(payload);
    console.log("RESPONSE SUCCESS:");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("RESPONSE ERROR:", err.message);
  }
}

run();
