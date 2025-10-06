const axios = require('axios');

exports.handler = async function(event, context) {
  const { category = 'business', pageSize = '15', sources = 'all' } = event.queryStringParameters || {};
  
  try {
    // Fetch from multiple news sources concurrently
    const newsPromises = [
      fetchNewsAPI(category, pageSize),
      fetchAlphaVantageNews(),
      fetchFinnhubMarketNews(),
      fetchFallbackFinancialNews()
    ];

    const results = await Promise.allSettled(newsPromises);
    
    // Combine and deduplicate articles
    const allArticles = [];
    const seenUrls = new Set();
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        result.value.forEach(article => {
          if (article.url && !seenUrls.has(article.url)) {
            seenUrls.add(article.url);
            allArticles.push(article);
          }
        });
      }
    });

    // Enhanced market impact analysis
    const analyzedArticles = allArticles
      .slice(0, pageSize)
      .map(article => ({
        ...article,
        marketImpact: analyzeMarketImpact(article),
        sentiment: analyzeAdvancedSentiment(article),
        relatedAssets: extractRelatedAssets(article),
        urgency: calculateUrgencyScore(article),
        tradingImplications: generateTradingImplications(article)
      }))
      .sort((a, b) => {
        // Sort by market impact and urgency
        const impactScore = { high: 3, medium: 2, low: 1 };
        return (impactScore[b.marketImpact] + b.urgency) - (impactScore[a.marketImpact] + a.urgency);
      });

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=300' // 5-minute cache
      },
      body: JSON.stringify({
        articles: analyzedArticles,
        totalResults: analyzedArticles.length,
        sourcesUsed: results.map((r, i) => r.status === 'fulfilled' ? true : false),
        analyzedAt: new Date().toISOString(),
        marketSummary: generateMarketSummary(analyzedArticles)
      })
    };
  } catch (error) {
    console.error('Enhanced news API error:', error);
    return getFallbackNews();
  }
};

async function fetchNewsAPI(category, pageSize) {
  if (!process.env.NEWS_API_KEY) return [];
  
  try {
    const response = await axios.get(`https://newsapi.org/v2/top-headlines`, {
      params: {
        category: category,
        language: 'en',
        pageSize: Math.ceil(pageSize / 2),
        apiKey: process.env.NEWS_API_KEY,
        q: 'stock OR crypto OR forex OR trading OR market OR federal OR earnings'
      },
      timeout: 5000
    });
    
    return response.data.articles || [];
  } catch (error) {
    console.warn('NewsAPI failed:', error.message);
    return [];
  }
}

async function fetchAlphaVantageNews() {
  if (!process.env.ALPHA_VANTAGE_KEY) return [];
  
  try {
    const response = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'NEWS_SENTIMENT',
        apikey: process.env.ALPHA_VANTAGE_KEY,
        topics: 'financial_markets,economy,fiscal_policy,monetary_policy',
        limit: 10
      },
      timeout: 5000
    });
    
    if (response.data && response.data.feed) {
      return response.data.feed.map(item => ({
        title: item.title,
        description: item.summary,
        url: item.url,
        source: { name: item.source },
        publishedAt: item.time_published,
        sentiment: item.overall_sentiment_label,
        tickers: item.ticker_sentiment?.map(t => t.ticker) || []
      }));
    }
    return [];
  } catch (error) {
    console.warn('Alpha Vantage news failed:', error.message);
    return [];
  }
}

async function fetchFinnhubMarketNews() {
  if (!process.env.FINNHUB_KEY) return [];
  
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/news`, {
      params: {
        category: 'general',
        token: process.env.FINNHUB_KEY
      },
      timeout: 5000
    });
    
    return response.data.slice(0, 10).map(item => ({
      title: item.headline,
      description: item.summary,
      url: item.url,
      source: { name: item.source },
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      relatedAssets: item.related ? item.related.split(',') : []
    }));
  } catch (error) {
    console.warn('Finnhub news failed:', error.message);
    return [];
  }
}

function analyzeMarketImpact(article) {
  const highImpactKeywords = [
    'fed', 'interest rates', 'inflation', 'earnings', 'merger', 'acquisition',
    'federal reserve', 'ecb', 'central bank', 'gdp', 'unemployment', 'rate hike',
    'quarterly results', 'profit', 'revenue', 'dividend'
  ];
  
  const mediumImpactKeywords = [
    'economic', 'growth', 'market', 'trading', 'investment', 'forecast',
    'outlook', 'analysis', 'price target', 'upgrade', 'downgrade'
  ];
  
  const content = (article.title + ' ' + (article.description || '')).toLowerCase();
  
  const highImpactCount = highImpactKeywords.filter(keyword => content.includes(keyword)).length;
  const mediumImpactCount = mediumImpactKeywords.filter(keyword => content.includes(keyword)).length;
  
  if (highImpactCount >= 2) return 'high';
  if (highImpactCount >= 1 || mediumImpactCount >= 2) return 'medium';
  return 'low';
}

function analyzeAdvancedSentiment(article) {
  const positiveWords = [
    'gain', 'rise', 'profit', 'growth', 'bullish', 'surge', 'rally', 'increase',
    'positive', 'strong', 'beat', 'upgrade', 'buy', 'outperform', 'success'
  ];
  
  const negativeWords = [
    'fall', 'drop', 'loss', 'decline', 'bearish', 'slump', 'plunge', 'decrease',
    'negative', 'weak', 'miss', 'downgrade', 'sell', 'underperform', 'failure'
  ];
  
  const content = (article.title + ' ' + (article.description || '')).toLowerCase();
  
  const positiveCount = positiveWords.filter(word => content.includes(word)).length;
  const negativeCount = negativeWords.filter(word => content.includes(word)).length;
  
  const score = positiveCount - negativeCount;
  
  if (score >= 2) return 'positive';
  if (score <= -2) return 'negative';
  return 'neutral';
}

function extractRelatedAssets(article) {
  const assets = [];
  const content = (article.title + ' ' + (article.description || '')).toUpperCase();
  
  // Stock tickers (1-5 uppercase letters)
  const stockRegex = /\b([A-Z]{1,5})\b/g;
  const stockMentions = content.match(stockRegex) || [];
  
  const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA', 'AMD', 'IBM'];
  stockMentions.forEach(stock => {
    if (popularStocks.includes(stock)) {
      assets.push({ symbol: stock, type: 'stock', confidence: 0.9 });
    }
  });
  
  // Crypto mentions
  const cryptos = [
    { symbol: 'BTC', names: ['BITCOIN', 'BTC'] },
    { symbol: 'ETH', names: ['ETHEREUM', 'ETH'] },
    { symbol: 'ADA', names: ['CARDANO', 'ADA'] },
    { symbol: 'SOL', names: ['SOLANA', 'SOL'] }
  ];
  
  cryptos.forEach(crypto => {
    if (crypto.names.some(name => content.includes(name))) {
      assets.push({ symbol: crypto.symbol, type: 'crypto', confidence: 0.8 });
    }
  });
  
  // Forex mentions
  const forexPairs = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
  forexPairs.forEach(currency => {
    if (content.includes(currency)) {
      assets.push({ symbol: currency, type: 'forex', confidence: 0.7 });
    }
  });
  
  return assets.slice(0, 5);
}

function calculateUrgencyScore(article) {
  const now = new Date();
  const published = new Date(article.publishedAt);
  const hoursDiff = (now - published) / (1000 * 60 * 60);
  
  // Score based on recency (more recent = higher score)
  let score = Math.max(0, 24 - hoursDiff) / 24;
  
  // Boost score for breaking news keywords
  const breakingKeywords = ['breaking', 'urgent', 'immediate', 'alert', 'just in'];
  const hasBreaking = breakingKeywords.some(keyword => 
    article.title.toLowerCase().includes(keyword)
  );
  
  if (hasBreaking) score += 0.3;
  
  return Math.min(1, score);
}

function generateTradingImplications(article) {
  const implications = [];
  const content = article.title + ' ' + (article.description || '');
  
  if (content.includes('interest rate') || content.includes('federal reserve')) {
    implications.push('Monitor bond yields and currency pairs');
  }
  
  if (content.includes('earnings') || content.includes('quarterly results')) {
    implications.push('Check specific stock volatility and options activity');
  }
  
  if (content.includes('inflation') || content.includes('CPI')) {
    implications.push('Watch gold, commodities, and inflation-protected securities');
  }
  
  if (content.includes('crypto') || content.includes('bitcoin')) {
    implications.push('Monitor cryptocurrency market sentiment and regulatory news');
  }
  
  return implications.length > 0 ? implications : ['General market sentiment analysis recommended'];
}

function generateMarketSummary(articles) {
  const highImpactCount = articles.filter(a => a.marketImpact === 'high').length;
  const positiveSentiment = articles.filter(a => a.sentiment === 'positive').length;
  const negativeSentiment = articles.filter(a => a.sentiment === 'negative').length;
  
  return {
    overallSentiment: positiveSentiment > negativeSentiment ? 'positive' : 
                     negativeSentiment > positiveSentiment ? 'negative' : 'neutral',
    marketImpactLevel: highImpactCount > 3 ? 'high' : highImpactCount > 1 ? 'medium' : 'low',
    newsVolume: articles.length,
    lastUpdated: new Date().toISOString()
  };
}

function getFallbackNews() {
  const fallbackArticles = [
    {
      title: "Market Pulse: Key Economic Indicators to Watch This Week",
      description: "Professional traders are monitoring inflation data and central bank announcements for market direction signals.",
      url: "#",
      source: { name: "Market Intelligence" },
      publishedAt: new Date().toISOString(),
      marketImpact: "medium",
      sentiment: "neutral",
      relatedAssets: [],
      urgency: 0.5,
      tradingImplications: ["Monitor economic calendar for data releases"]
    },
    {
      title: "Technical Analysis: Major Support and Resistance Levels",
      description: "Key technical levels being tested across major indices and currency pairs in current session.",
      url: "#",
      source: { name: "Technical Analysis" },
      publishedAt: new Date().toISOString(),
      marketImpact: "low",
      sentiment: "neutral",
      relatedAssets: [],
      urgency: 0.3,
      tradingImplications: ["Review technical charts for entry/exit points"]
    }
  ];

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      articles: fallbackArticles,
      totalResults: fallbackArticles.length,
      sourcesUsed: [false, false, false, true],
      analyzedAt: new Date().toISOString(),
      marketSummary: generateMarketSummary(fallbackArticles),
      error: "Using fallback news data"
    })
  };
}