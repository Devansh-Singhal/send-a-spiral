function photoCrop(width, height, selection = { x: 0, y: 0, width: 1, height: 1 }) {
  const cropWidth = Math.max(1, Math.min(width, width * (selection.width ?? 1)));
  const cropHeight = Math.max(1, Math.min(height, height * (selection.height ?? 1)));
  return {
    x: Math.max(0, Math.min(width - cropWidth, width * (selection.x ?? 0))),
    y: Math.max(0, Math.min(height - cropHeight, height * (selection.y ?? 0))),
    width: cropWidth,
    height: cropHeight
  };
}

async function preparePhoto(file, selection = null) {
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type)) throw new Error('Choose a JPG, PNG, WebP or another supported photo.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    try { await image.decode(); } catch { throw new Error('This photo could not open. Try a JPG or PNG.'); }
    const crop = selection === null ? null : photoCrop(image.naturalWidth, image.naturalHeight, selection);
    const width = crop ? crop.width : image.naturalWidth, height = crop ? crop.height : image.naturalHeight;
    const scale = Math.min(1, 1000 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (crop) ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    else ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.88, .72, .5]) {
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= 680000) return data;
    }
    throw new Error('This photo is too detailed to send. Try a smaller photo.');
  } finally { URL.revokeObjectURL(url); }
}

if (typeof module !== 'undefined') module.exports = { photoCrop, preparePhoto };
