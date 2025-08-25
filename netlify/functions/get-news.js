const axios = require('axios');

exports.handler = async function(event, context) {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  
  try {
    const { category = 'business' } = event.queryStringParameters || {};
    
    const response = await axios.get(`https://newsapi.org/v2/top-headlines`, {
      params: {
        category: category,
        language: 'en',
        apiKey: NEWS_API_KEY
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
      body: JSON.stringify({ error: 'Failed to fetch news' })
    };
  }
};