exports.handler = async function (event, context) {
  const services = {
    newsAPI: process.env.NEWS_API_KEY ? 'operational' : 'missing_key',
    alphaVantage: process.env.ALPHA_VANTAGE_KEY ? 'operational' : 'missing_key',
    finnhub: process.env.FINNHUB_KEY ? 'operational' : 'missing_key'
  };

  const operational = Object.values(services).filter(status => status === 'operational').length;
  const total = Object.values(services).length;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      status: operational === total ? 'healthy' : 'degraded',
      services,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    })
  };
};