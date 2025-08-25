const axios = require('axios');

exports.handler = async function(event, context) {
  const FINNHUB_KEY = process.env.FINNHUB_KEY;
  
  try {
    const { symbol } = event.queryStringParameters || {};
    
    const response = await axios.get(`https://finnhub.io/api/v1/stock/recommendation`, {
      params: {
        symbol: symbol,
        token: FINNHUB_KEY
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
      body: JSON.stringify({ error: 'Failed to fetch recommendations' })
    };
  }
};