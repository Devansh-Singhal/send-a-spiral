(() => {
  'use strict';
  const $ = id => document.getElementById(id), drawing = makeSpiral($('spiral'));
  let prepared = '', uploaded = '', current = '', plain = false, timer, uploadVersion = 0;
  const gift = () => ({ to: Spiral.clean($('to').value, 40), from: Spiral.clean($('from').value, 40), note: Spiral.clean($('note').value, 140), photo: uploaded });
  drawing.load('/demo-photo.jpg').then(() => { if (!prepared) drawing.play(); }).catch(() => { $('preview-name').textContent = 'Choose a photo to see your spiral.'; });
  function toast(text) { $('status').textContent = text; $('status').classList.add('on'); clearTimeout(timer); timer = setTimeout(() => $('status').classList.remove('on'), 3000); }
  $('photo').addEventListener('change', async () => {
    const version = ++uploadVersion;
    prepared = ''; uploaded = ''; $('result').hidden = true; $('photo-error').hidden = true; $('photo').removeAttribute('aria-invalid');
    const file = $('photo').files[0]; if (!file) return;
    $('submit').disabled = true; $('preview-name').textContent = 'Preparing your photo…';
    try {
      const image = await preparePhoto(file);
      if (version !== uploadVersion) return;
      prepared = image; await drawing.load(image);
      if (version !== uploadVersion) return;
      drawing.play(); $('preview-name').textContent = gift().to ? 'A spiral for ' + gift().to : 'Your photo, made of love.';
    } catch (error) {
      if (version !== uploadVersion) return;
      prepared = ''; $('photo-error').textContent = error.message; $('photo-error').hidden = false; $('photo').setAttribute('aria-invalid', 'true');
      $('preview-name').textContent = 'Choose another photo to try again.';
    } finally { if (version === uploadVersion) $('submit').disabled = false; }
  });
  ['to', 'from', 'note'].forEach(id => $(id).addEventListener('input', () => {
    $(id).value = Array.from($(id).value).slice(0, id === 'note' ? 140 : 40).join('');
    $('count').textContent = Array.from($('note').value).length + ' / 140';
    $('preview-name').textContent = gift().to ? 'A spiral for ' + gift().to : 'A little love, coming into view.';
    if (gift().to) { $('error').hidden = true; $('to').removeAttribute('aria-invalid'); }
    $('result').hidden = true;
  }));
  $('create').addEventListener('submit', async event => {
    event.preventDefault();
    if ($('submit').disabled) return;
    if (!prepared) { $('photo-error').textContent = 'Choose a photo to make it yours.'; $('photo-error').hidden = false; $('photo').setAttribute('aria-invalid','true'); $('photo').focus(); return; }
    if (!gift().to) { $('error').hidden = false; $('to').setAttribute('aria-invalid', 'true'); $('to').focus(); return; }
    $('create-error').hidden = true; $('submit').disabled = true; $('submit').textContent = 'Making their spiral…';
    const version = uploadVersion;
    try {
      if (!uploaded) {
        const response = await fetch('/api/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: prepared }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Your photo could not be saved. Please try again.');
        if (version !== uploadVersion) return;
        uploaded = Spiral.photoId(result.id);
        if (!uploaded) throw new Error('Your photo could not be saved. Please try again.');
      }
      const data = gift(); current = Spiral.linkFor(location.origin, data);
      $('link').value = current; $('open').href = current;
      $('whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent('A little surprise for you, ' + data.to + '. ' + current);
      $('share').hidden = !navigator.share; $('qrbox').hidden = true; $('result').hidden = false; $('ready').focus();
      $('result').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
      history.replaceState(null, '', '/made'); if (window.va) window.va('pageview', { route: '/made', path: '/made' });
    } catch (error) { $('create-error').textContent = error.message; $('create-error').hidden = false; }
    finally { $('submit').disabled = false; $('submit').textContent = 'Create their spiral'; }
  });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(current); toast('Link copied. Send a little love.'); }
    catch { $('link').focus(); $('link').select(); toast('Select Copy to copy your link.'); }
  });
  $('share').addEventListener('click', async () => {
    try { await navigator.share({ title: 'A spiral for ' + gift().to, url: current }); }
    catch (error) { if (error.name !== 'AbortError') toast('Try Copy link or WhatsApp instead.'); }
  });
  function drawQR() {
    try { (plain ? window.drawPlainQR : window.drawHeartQR)($('qr'), current); $('qrstyle').textContent = plain ? 'Use a heart QR' : 'Use a plain QR'; $('qrbox').hidden = false; }
    catch { if (!plain) { plain = true; drawQR(); } else { $('qrbox').hidden = true; toast('This link is too long for a QR. Try a shorter note.'); } }
  }
  $('makeqr').addEventListener('click', () => { plain = false; drawQR(); });
  $('qrstyle').addEventListener('click', () => { plain = !plain; drawQR(); });
  $('saveqr').addEventListener('click', () => $('qr').toBlob(blob => {
    if (!blob) { toast('Could not save. Please try again.'); return; }
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'a-spiral-for-you.png'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }, 'image/png'));
})();
