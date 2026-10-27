const { randomBytes } = require('node:crypto');
const { photoId } = require('./core');
const MAX_PHOTO_BYTES = 510000;
function decodePhoto(value) {
  if (typeof value !== 'string' || value.length > 680023 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value)) return null;
  const bytes = Buffer.from(value.slice(23), 'base64');
  if (bytes.length < 4 || bytes.length > MAX_PHOTO_BYTES || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) return null;
  return bytes;
}
async function savePhoto(bytes) {
  const id = randomBytes(16).toString('hex');
  if (process.env.SPIRAL_LOCAL_UPLOADS && !process.env.VERCEL) {
    const fs = require('node:fs/promises'), path = require('node:path');
    await fs.mkdir(process.env.SPIRAL_LOCAL_UPLOADS, { recursive: true });
    await fs.writeFile(path.join(process.env.SPIRAL_LOCAL_UPLOADS, id + '.jpg'), bytes);
  } else {
    const { put } = await import('@vercel/blob');
    await put('photos/' + id + '.jpg', bytes, { access: 'private', contentType: 'image/jpeg', addRandomSuffix: false });
  }
  return id;
}
async function loadPhoto(id) {
  if (!photoId(id)) return null;
  if (process.env.SPIRAL_LOCAL_UPLOADS && !process.env.VERCEL) {
    const fs = require('node:fs/promises'), path = require('node:path');
    try { return await fs.readFile(path.join(process.env.SPIRAL_LOCAL_UPLOADS, id + '.jpg')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  const { get } = await import('@vercel/blob');
  const result = await get('photos/' + id + '.jpg', { access: 'private' });
  return result ? Buffer.from(await new Response(result.stream).arrayBuffer()) : null;
}
module.exports = { decodePhoto, savePhoto, loadPhoto };
