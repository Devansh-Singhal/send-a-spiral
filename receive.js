(() => {
  'use strict';
  const $ = id => document.getElementById(id), gift = Spiral.readGift(new URLSearchParams(location.search));
  $('gate-name').textContent = gift.to || 'for you'; $('recipient').textContent = gift.to ? 'For ' + gift.to + '.' : 'For you.';
  $('sender').textContent = gift.from ? gift.from + ' made this for you.' : 'Someone made this for you.';
  $('note').textContent = gift.note || 'Every little part of me loves you.'; $('signature').textContent = gift.from ? 'With love, ' + gift.from : 'Made just for you.';
  document.title = gift.to ? 'A spiral for ' + gift.to : 'A spiral for you';
  const drawing = makeSpiral($('spiral')), bgm = $('bgm'), sound = $('sound');
  let started = false, ready = false, resumeOnReturn = false, loading = false;
  bgm.volume = .85; drawing.still(0);
  function soundState(blocked = false) {
    sound.textContent = blocked ? 'Turn sound on' : bgm.muted ? 'Sound off' : 'Sound on';
    sound.setAttribute('aria-label', blocked || bgm.muted ? 'Turn sound on' : 'Mute sound'); sound.setAttribute('aria-pressed', String(!blocked && !bgm.muted));
  }
  function startMusic(restart) { if (restart) bgm.currentTime = 0; bgm.play().then(() => soundState()).catch(() => soundState(true)); }
  function replay() { if (!started) return; startMusic(true); if (ready) drawing.play(); }
  async function loadPhoto() {
    if (loading) return;
    loading = true; $('retry-photo').hidden = true;
    $('photo-status').textContent = 'Your photo is on its way…';
    try {
      if (!gift.photo) throw new Error('missing');
      await drawing.load('/api/photo?id=' + gift.photo); ready = true;
      $('photo-status').hidden = true;
      if (started) drawing.play();
    } catch {
      $('photo-status').textContent = 'The photo could not load. Please try again.';
      if (started) { $('photo-status').hidden = false; $('retry-photo').hidden = false; }
    } finally { loading = false; }
  }
  loadPhoto();
  $('reveal').addEventListener('click', () => {
    if (started) return;
    started = true; $('experience').hidden = false; $('reveal').classList.add('leaving');
    setTimeout(() => { $('reveal').hidden = true; }, 700);
    if (!ready) { $('photo-status').hidden = false; if (!loading) $('retry-photo').hidden = false; }
    replay(); $('replay').focus({ preventScroll: true });
  });
  $('replay').addEventListener('click', replay); $('retry-photo').addEventListener('click', loadPhoto);
  sound.addEventListener('click', () => { if (bgm.paused) { bgm.muted = false; startMusic(false); } else { bgm.muted = !bgm.muted; soundState(); } });
  bgm.addEventListener('ended', () => { if (!document.hidden) replay(); }); bgm.addEventListener('error', () => soundState(true));
  function onHide() { if (!bgm.paused) { resumeOnReturn = true; bgm.pause(); } }
  document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); else if (resumeOnReturn) { resumeOnReturn = false; if (!bgm.muted) startMusic(false); } });
  window.addEventListener('pagehide', onHide);
})();
