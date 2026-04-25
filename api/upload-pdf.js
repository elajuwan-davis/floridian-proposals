export default async function handler(req, res) {
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
    const { blobUrl, filename } = req.body || {};
    if (!blobUrl) {
      return res.status(400).json({ error: 'blobUrl is required' });
    }

    const blobResp = await fetch(blobUrl);
    if (!blobResp.ok) {
      throw new Error('Failed to fetch blob: ' + blobResp.status);
    }
    const fileBlob = await blobResp.blob();

    const formData = new FormData();
    formData.append('file', fileBlob, filename || 'proposal.pdf');

    const response = await fetch('https://api.anthropic.com/v1/files', {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14',
        'x-api-key': apiKey,
      },
      body: formData,
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
