const axios = require('axios');

exports.handler = async function(event, context) {
  const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;
  
  try {
    const { symbol } = event.queryStringParameters || {};
    
    const response = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: ALPHA_VANTAGE_KEY
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch stock data' })
    };
  }
};