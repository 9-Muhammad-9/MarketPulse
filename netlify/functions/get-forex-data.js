// Add to your Netlify functions for enhanced data:

// netlify/functions/get-forex-data.js
const axios = require('axios');

exports.handler = async function(event, context) {
  const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;
  
  try {
    const response = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'CURRENCY_EXCHANGE_RATE',
        from_currency: 'EUR',
        to_currency: 'USD',
        apikey: ALPHA_VANTAGE_KEY
      }
    });
    
    // Add more currency pairs as needed
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch forex data' })
    };
  }
};