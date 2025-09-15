// netlify/functions/valorant-api.js
exports.handler = async (event, context) => {
  // Only allow specific origins (your domain)
  const allowedOrigins = [
    'http://localhost:8888',
    'https://yourdomain.netlify.app', // Replace with your actual domain
  ];
  
  const origin = event.headers.origin;
  const isAllowed = allowedOrigins.includes(origin);
  
  if (!isAllowed && process.env.NODE_ENV === 'production') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden' })
    };
  }

  // The actual API endpoint (hidden from client)
  const API_BASE = process.env.VALORANT_API_BASE || 'https://nirmitsachde-valorant-match-predictor.hf.space';
  
  // Get the path and query from the request
  const path = event.path.replace('/.netlify/functions/valorant-api', '');
  const queryString = event.rawQuery ? `?${event.rawQuery}` : '';
  
  try {
    const response = await fetch(`${API_BASE}${path}${queryString}`, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
      },
      body: event.body
    });
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};