(() => {
  'use strict';
  const $ = id => document.getElementById(id), drawing = makeSpiral($('spiral')), crop = makePhotoCrop($('crop-canvas'));
  let prepared = '', uploaded = '', current = '', plain = false, timer, uploadVersion = 0, cropSelection = null;
  const wordCards = Array.from(document.querySelectorAll('input[name="words"]'));
  const words = () => { const value = wordCards.find(card => card.checked).value; return value === 'custom' ? Spiral.clean($('custom-words').value, 40) : value; };
  const gift = () => ({ to: Spiral.clean($('to').value, 40), from: Spiral.clean($('from').value, 40), note: Spiral.clean($('note').value, 140), photo: uploaded, text: words() });
  function updateWords() {
    const custom = wordCards.find(card => card.checked).value === 'custom';
    $('custom-words-field').hidden = !custom;
    $('custom-words').value = Array.from($('custom-words').value).slice(0,40).join('');
    $('words-error').hidden = true; $('custom-words').removeAttribute('aria-invalid'); $('result').hidden = true;
    drawing.setText(words()); drawing.play();
  }
  wordCards.forEach(card => card.addEventListener('change', () => { updateWords(); if (card.value === 'custom' && card.checked) $('custom-words').focus(); }));
  $('custom-words').addEventListener('input', updateWords);
  drawing.load('/demo-photo.jpg').then(() => { if (!prepared) drawing.play(); }).catch(() => { $('preview-name').textContent = 'Choose a photo to see your spiral.'; });
  function toast(text) { $('status').textContent = text; $('status').classList.add('on'); clearTimeout(timer); timer = setTimeout(() => $('status').classList.remove('on'), 3000); }
  $('photo').addEventListener('change', async () => {
    const version = ++uploadVersion;
    prepared = ''; uploaded = ''; cropSelection = null; $('crop-editor').hidden = true; $('crop-open').hidden = true; $('crop-open').textContent = 'Crop photo'; $('result').hidden = true; $('photo-error').hidden = true; $('photo').removeAttribute('aria-invalid');
    const file = $('photo').files[0]; if (!file) return;
    $('submit').disabled = true; $('preview-name').textContent = 'Preparing your photo…';
    try {
      const image = await preparePhoto(file);
      if (version !== uploadVersion) return;
      prepared = image; await drawing.load(image, () => version === uploadVersion);
      if (version !== uploadVersion) return;
      drawing.play(); $('crop-open').hidden = false; $('preview-name').textContent = gift().to ? 'A spiral for ' + gift().to : 'Your photo, made of love.';
    } catch (error) {
      if (version !== uploadVersion) return;
      prepared = ''; $('photo-error').textContent = error.message; $('photo-error').hidden = false; $('photo').setAttribute('aria-invalid', 'true');
      $('preview-name').textContent = 'Choose another photo to try again.';
    } finally { if (version === uploadVersion) $('submit').disabled = false; }
  });
  $('crop-open').addEventListener('click', async () => {
    if (!$('crop-editor').hidden) { $('crop-canvas').focus(); return; }
    const version = uploadVersion;
    $('submit').disabled = true; $('crop-open').disabled = true;
    try {
      await crop.load($('photo').files[0], cropSelection);
      if (version !== uploadVersion) return;
      $('crop-editor').hidden = false; $('crop-canvas').focus();
    } catch { if (version === uploadVersion) { toast('This photo could not open for cropping. Choose it again.'); $('submit').disabled = false; } }
    finally { $('crop-open').disabled = false; }
  });
  $('crop-reset').addEventListener('click', () => crop.reset());
  $('crop-cancel').addEventListener('click', () => { ++uploadVersion; $('crop-editor').hidden = true; $('submit').disabled = false; $('crop-open').focus(); });
  $('crop-apply').addEventListener('click', async () => {
    const version = ++uploadVersion;
    $('crop-apply').disabled = true;
    try {
      const selection = crop.selection(), image = await preparePhoto($('photo').files[0], selection);
      if (version !== uploadVersion) return;
      await drawing.load(image, () => version === uploadVersion);
      if (version !== uploadVersion) return;
      cropSelection = selection; prepared = image; uploaded = ''; $('result').hidden = true; $('crop-editor').hidden = true;
      drawing.play(); $('crop-open').textContent = 'Adjust crop'; $('crop-open').focus();
    } catch (error) { toast(error.message); }
    finally { $('crop-apply').disabled = false; if (version === uploadVersion) $('submit').disabled = !$('crop-editor').hidden; }
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
    if (!words()) { $('words-error').hidden = false; $('custom-words').setAttribute('aria-invalid','true'); $('custom-words').focus(); return; }
    if (!gift().to) { $('error').hidden = false; $('to').setAttribute('aria-invalid', 'true'); $('to').focus(); return; }
    $('create-error').hidden = true; $('submit').disabled = true; $('crop-open').disabled = true; $('photo').disabled = true; $('submit').textContent = 'Making their spiral…';
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
    finally { $('submit').disabled = !$('crop-editor').hidden; $('crop-open').disabled = false; $('photo').disabled = false; $('submit').textContent = 'Create their spiral'; }
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
    catch { if (!plain) { plain = true; drawQR(); } else { $('qrbox').hidden = true; toast('This link is too long for a QR. Try shorter words or a shorter note.'); } }
  }
  $('makeqr').addEventListener('click', () => { plain = false; drawQR(); });
  $('qrstyle').addEventListener('click', () => { plain = !plain; drawQR(); });
  $('saveqr').addEventListener('click', () => $('qr').toBlob(blob => {
    if (!blob) { toast('Could not save. Please try again.'); return; }
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'a-spiral-for-you.png'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }, 'image/png'));
})();
