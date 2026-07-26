const Cerebras = require('@cerebras/cerebras_cloud_sdk');

let clientInstance = null;

/**
 * Retrieve the singleton Cerebras client instance.
 * Ensures the SDK instance is constructed once and reused across requests for TCP warming.
 */
function getCerebrasClient() {
  if (!clientInstance) {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("CEREBRAS_API_KEY is not defined in environment variables. Please check your .env file.");
    }
    clientInstance = new Cerebras({
      apiKey: apiKey
    });
  }
  return clientInstance;
}

module.exports = {
  getCerebrasClient
};
