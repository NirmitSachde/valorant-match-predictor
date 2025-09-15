exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // The actual API endpoint
    const API_BASE = process.env.API_BASE || 'https://nirmitsachde-valorant-match-predictor.hf.space';
    
    // Extract the path after /valorant-api
    const path = event.path.replace('/.netlify/functions/valorant-api', '');
    const queryString = event.rawQuery ? `?${event.rawQuery}` : '';
    const url = `${API_BASE}${path}${queryString}`;
    
    console.log('Requesting:', url); // For debugging in Netlify logs
    
    // Prepare fetch options
    const fetchOptions = {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    // Add body for POST requests
    if (event.httpMethod === 'POST' && event.body) {
      fetchOptions.body = event.body;
    }
    
    // Make the request
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};