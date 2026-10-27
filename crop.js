function makePhotoCrop(canvas) {
  'use strict';
  const ctx = canvas.getContext('2d'), clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const full = () => ({ x: 0, y: 0, width: 1, height: 1 });
  let image = null, selection = full(), pointer = null, generation = 0;
  function render() {
    if (!image) return;
    const rect = photoCrop(image.naturalWidth, image.naturalHeight, selection);
    selection = { x: rect.x / image.naturalWidth, y: rect.y / image.naturalHeight, width: rect.width / image.naturalWidth, height: rect.height / image.naturalHeight };
    const w = canvas.width, h = canvas.height, x = selection.x * w, y = selection.y * h, cw = selection.width * w, ch = selection.height * h;
    ctx.drawImage(image, 0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(0, 0, w, y); ctx.fillRect(0, y + ch, w, h - y - ch);
    ctx.fillRect(0, y, x, ch); ctx.fillRect(x + cw, y, w - x - cw, ch);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
    ctx.fillStyle = '#ff98a6';
    const handle = Math.max(10, w / 35);
    for (const [hx, hy] of [[x,y],[x+cw/2,y],[x+cw,y],[x,y+ch/2],[x+cw,y+ch/2],[x,y+ch],[x+cw/2,y+ch],[x+cw,y+ch]]) {
      ctx.fillRect(clamp(hx-handle/2,0,w-handle), clamp(hy-handle/2,0,h-handle), handle, handle);
    }
  }
  async function load(file, initialSelection = null) {
    const version = ++generation, url = URL.createObjectURL(file);
    try {
      const next = new Image(); next.src = url; await next.decode(); if (version !== generation) return;
      image = next; const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
      selection = initialSelection ? { ...initialSelection } : full(); render();
    } finally { URL.revokeObjectURL(url); }
  }
  const position = event => {
    const bounds = canvas.getBoundingClientRect();
    return { x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1), y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1), tx: 16 / bounds.width, ty: 16 / bounds.height };
  };
  canvas.addEventListener('pointerdown', event => {
    if (!image) return;
    const p = position(event), s = selection;
    const nearX = p.x >= s.x-p.tx && p.x <= s.x+s.width+p.tx, nearY = p.y >= s.y-p.ty && p.y <= s.y+s.height+p.ty;
    let mode = '';
    if (nearY && Math.abs(p.x-s.x) <= p.tx) mode += 'l';
    else if (nearY && Math.abs(p.x-s.x-s.width) <= p.tx) mode += 'r';
    if (nearX && Math.abs(p.y-s.y) <= p.ty) mode += 't';
    else if (nearX && Math.abs(p.y-s.y-s.height) <= p.ty) mode += 'b';
    if (!mode) mode = p.x >= s.x && p.x <= s.x+s.width && p.y >= s.y && p.y <= s.y+s.height ? 'move' : 'new';
    pointer = { id: event.pointerId, x: p.x, y: p.y, mode, start: { ...s } }; canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const p = position(event), s = pointer.start, dx = p.x-pointer.x, dy = p.y-pointer.y, min = .02;
    if (pointer.mode === 'move') selection = { ...s, x: clamp(s.x+dx,0,1-s.width), y: clamp(s.y+dy,0,1-s.height) };
    else if (pointer.mode === 'new') selection = { x: Math.min(pointer.x,p.x), y: Math.min(pointer.y,p.y), width: Math.max(min,Math.abs(dx)), height: Math.max(min,Math.abs(dy)) };
    else {
      let left=s.x, right=s.x+s.width, top=s.y, bottom=s.y+s.height;
      if (pointer.mode.includes('l')) left=clamp(s.x+dx,0,right-min);
      if (pointer.mode.includes('r')) right=clamp(right+dx,left+min,1);
      if (pointer.mode.includes('t')) top=clamp(s.y+dy,0,bottom-min);
      if (pointer.mode.includes('b')) bottom=clamp(bottom+dy,top+min,1);
      selection={x:left,y:top,width:right-left,height:bottom-top};
    }
    render();
  });
  const release = () => { pointer = null; };
  canvas.addEventListener('pointerup',release); canvas.addEventListener('pointercancel',release); canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('keydown',event=>{
    const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key]; if (!direction || !image) return;
    event.preventDefault();
    if (event.shiftKey) { selection.width=clamp(selection.width+direction[0]*.02,.02,1-selection.x); selection.height=clamp(selection.height+direction[1]*.02,.02,1-selection.y); }
    else { selection.x=clamp(selection.x+direction[0]*.02,0,1-selection.width); selection.y=clamp(selection.y+direction[1]*.02,0,1-selection.height); }
    render();
  });
  return { load, reset() { selection=full();render(); }, selection:()=>({...selection}) };
}
