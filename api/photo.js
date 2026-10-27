const { decodePhoto, savePhoto, loadPhoto } = require('../storage');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Robots-Tag', 'noindex');
  const json = (status, value) => { res.statusCode = status; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(value)); };
  try {
    if (req.method === 'POST') {
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      if (req.headers.origin && new URL(req.headers.origin).host !== host) return json(403, { error: 'Please create your gift from this site.' });
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(415, { error: 'Choose a photo and try again.' });
      const bytes = decodePhoto(req.body && req.body.image);
      if (!bytes) return json(400, { error: 'This photo could not be saved. Choose a JPG or PNG and try again.' });
      return json(201, { id: await savePhoto(bytes) });
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const bytes = await loadPhoto(new URL(req.url, 'https://local.test').searchParams.get('id'));
      if (!bytes) return json(404, { error: 'Photo not found.' });
      res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Content-Length', String(bytes.length)); res.end(req.method === 'HEAD' ? undefined : bytes); return;
    }
    res.setHeader('Allow','GET, HEAD, POST'); return json(405, { error: 'Method not allowed.' });
  } catch { return json(503, { error: 'Your photo could not be saved or loaded. Please try again in a moment.' }); }
};
module.exports.config = { api: { bodyParser: { sizeLimit: '700kb' } } };
