// Vercel serverless function — proxies PDF upload to Anthropic Files API
// Bypasses CORS restriction on direct browser-to-Anthropic calls
// Uses ANTHROPIC_API_KEY environment variable set in Vercel dashboard

export const config = {
  api: {
    bodyParser: false, // Required: we handle raw multipart form data
  },
};

export default async function handler(req, res) {
  // CORS headers — allow requests from our own domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    // Collect raw body chunks
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const bodyBuffer = Buffer.concat(chunks);

    // Forward request to Anthropic Files API with server-side API key
    const response = await fetch('https://api.anthropic.com/v1/files', {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14',
        'x-api-key': apiKey,
        'content-type': req.headers['content-type'],
      },
      body: bodyBuffer,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Upload proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
