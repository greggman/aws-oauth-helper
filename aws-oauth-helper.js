const https = require('https');
const {URL, URLSearchParams} = require('url');

function createURL(base, params) {
  const url = new URL(base);
  const searchParams = new URLSearchParams(url.search);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      searchParams.delete(key);
    } else {
      searchParams.set(key, value);
    }
  }
  url.search = searchParams.toString();
  return url.href;
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        chunks.push(chunk.toString());
      });
      res.on('end', () => {
        const statusCode = res.statusCode;
        const body = chunks.join('');
        if (statusCode >= 200 && statusCode < 300) {
          resolve({body, headers: res.headers});
        } else {
          reject({statusCode, body, headers: res.headers});
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event, context) => {
  const {
    code,
    client,
    redirectUri,
    state,
    endPoint,
  } = event.queryStringParameters;
  const corsHeaders = {
    "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
    "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
  };
  const secret = process.env[`c_${client}`];
  if (!secret) {
    return {
      statusCode: 400,
      //  ${Object.entries(process.env).map(([k, v]) => `${k}=${v}`)}
      body: JSON.stringify({message: `No secret is configured for client ID: ${client}`}),
      headers: corsHeaders,
    };
  }
  
  try {
    const params = {
      client_id: client,
      client_secret: secret,
      code: code,
      ...(state && {state}),
      ...(redirectUri && {redirect_uri: redirectUri}),
    };
  
    let url;  
    try {
      url = new URL(endPoint);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({message: `Bad endPoint: ${endPoint}`}),
        headers: corsHeaders,
      };
    }

    const options = {
      hostname: url.hostname,
      method: 'POST',
      path: createURL(url.href, params),
      headers: {
       'User-Agent': 'greggman',
       'Content-Type': 'application/json',
       'Accept': 'application/json',
      },
    };
    const body = '';
    const {body: json, headers} = await request(options, body);
    return {
      statusCode: 200,
      body: json,
      headers: corsHeaders,
    };
  } catch (e) {
    return {
      statusCode: e.statusCode,
      body: JSON.stringify({body: e.body, headers: e.headers}, null, 2),
      headers: corsHeaders,
    };
  }
};
