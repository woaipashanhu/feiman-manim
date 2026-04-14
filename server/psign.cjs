const http = require('http');
const crypto = require('crypto');

const VOD_APP_ID = 1384489847;
const PLAY_KEY = process.env.PLAY_KEY || '';

function base64UrlEncode(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generatePsign(fileId) {
  const now = Math.floor(Date.now() / 1000);
  const expire = now + 7 * 24 * 3600;

  const header = base64UrlEncode(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64UrlEncode(Buffer.from(JSON.stringify({
    appId: VOD_APP_ID,
    fileId: fileId,
    contentInfo: {
      audioVideoType: 'Original',
    },
    currentTimeStamp: now,
    expireTimeStamp: expire,
    urlAccessInfo: {
      scheme: 'HTTPS',
    },
  })));

  const signature = crypto
    .createHmac('sha256', PLAY_KEY)
    .update(header + '.' + payload)
    .digest();

  return header + '.' + payload + '.' + base64UrlEncode(signature);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const fileId = url.searchParams.get('fileId');

  if (!fileId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'fileId is required' }));
  }

  const psign = generatePsign(fileId);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ psign }));
});

const PORT = 3100;
server.listen(PORT, () => {
  console.log(`psign server running on http://localhost:${PORT}`);
});