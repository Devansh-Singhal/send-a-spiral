const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Spiral = require('../core');
const { photoCrop } = require('../photo');

const cropSource = fs.readFileSync(path.join(__dirname, '../crop.js'), 'utf8');
const drawSource = fs.readFileSync(path.join(__dirname, '../draw.js'), 'utf8');

function imageLoader() {
  const pending = new Map();
  return {
    Image: class {
      naturalWidth = 1000;
      naturalHeight = 2000;
      decode() { return new Promise(resolve => pending.set(this.src, resolve)); }
    },
    finish(src) { assert.ok(pending.has(src), 'the image must be decoding'); pending.get(src)(); }
  };
}

function cropView() {
  const images = imageLoader(), listeners = new Map(), draws = [], captured = [], revoked = [];
  const canvas = {
    width: 600, height: 780,
    getContext: () => ({ strokeRect() {}, fillRect() {}, drawImage(image, ...coordinates) { draws.push({ src: image.src, coordinates }); } }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 600 }),
    addEventListener(event, callback) { listeners.set(event, callback); },
    setPointerCapture(id) { captured.push(id); }
  };
  const environment = {
    photoCrop, Image: images.Image,
    URL: { createObjectURL: file => 'blob:' + file.name, revokeObjectURL: url => revoked.push(url) }
  };
  vm.runInNewContext(cropSource, environment);
  const api = environment.makePhotoCrop(canvas);
  return {
    api, draws, captured, revoked, finish: images.finish,
    event(name, values) { listeners.get(name)(values); },
    async load(selection = null) {
      const loading = api.load({ name: 'photo' }, selection);
      images.finish('blob:photo');
      await loading;
    }
  };
}

test('free crop edges resize independently and preserve a wide selection', async () => {
  const view = cropView(); await view.load({x:.2,y:.2,width:.6,height:.6});
  view.event('pointerdown', {pointerId:1,clientX:240,clientY:300});
  view.event('pointermove', {pointerId:1,clientX:270,clientY:300});
  const rect = view.api.selection();
  assert.ok(Math.abs(rect.width-.7)<1e-9); assert.ok(Math.abs(rect.height-.6)<1e-9);
});
test('dragging the selection moves it and stops at the image edges', async () => {
  const view=cropView(); await view.load({x:.2,y:.2,width:.4,height:.3});
  view.event('pointerdown',{pointerId:1,clientX:120,clientY:210});
  view.event('pointermove',{pointerId:1,clientX:300,clientY:600});
  assert.deepEqual({...view.api.selection()},{x:.6,y:.7,width:.4,height:.3});
  view.event('pointerup',{}); view.event('pointermove',{pointerId:1,clientX:0,clientY:0});
  assert.deepEqual({...view.api.selection()},{x:.6,y:.7,width:.4,height:.3});
});
test('keyboard movement and Shift resizing keep the aspect ratio unlocked',async()=>{
  const view=cropView();await view.load({x:.2,y:.2,width:.4,height:.3});let prevented=0;
  view.event('keydown',{key:'ArrowRight',preventDefault(){prevented++;}});
  view.event('keydown',{key:'ArrowDown',shiftKey:true,preventDefault(){prevented++;}});
  const rect=view.api.selection(); assert.equal(rect.x,.22);assert.equal(rect.width,.4);assert.equal(rect.height,.32);assert.equal(prevented,2);
});
test('reopening restores a saved free rectangle while reset selects the full photo',async()=>{
  const view=cropView(),saved={x:.1,y:.3,width:.7,height:.2};await view.load(saved);
  assert.deepEqual({...view.api.selection()},saved);view.api.reset();
  assert.deepEqual({...view.api.selection()},{x:0,y:0,width:1,height:1});
  assert.deepEqual(saved,{x:.1,y:.3,width:.7,height:.2});
});
test('a stale image decode cannot replace the newer crop selection',async()=>{
  const view=cropView();const old=view.api.load({name:'old'},{x:.1,y:.1,width:.2,height:.3});
  const newer=view.api.load({name:'new'},{x:.2,y:.2,width:.6,height:.5});
  view.finish('blob:new');await newer;view.finish('blob:old');await old;
  assert.equal(view.draws.length,1);assert.equal(view.draws[0].src,'blob:new');
  assert.deepEqual({...view.api.selection()},{x:.2,y:.2,width:.6,height:.5});
});
test('cancelling during preview decode preserves the previous photo pixels', async () => {
  const images = imageLoader(), sampled = [];
  const output = { dataset: {}, getContext: () => ({ fillRect() {}, measureText:()=>({width:3}) }) };
  const sample = { getContext: () => ({
    fillRect() {}, drawImage(image) { sampled.push(image.src); },
    getImageData: () => ({ data: new Uint8ClampedArray(0) })
  }) };
  const environment = {
    Spiral, Image: images.Image,
    document: { createElement: () => sample, addEventListener() {} }
  };
  vm.runInNewContext(drawSource, environment);
  const drawing = environment.makeSpiral(output);
  const original = drawing.load('original');
  images.finish('original'); await original;
  let current = true;
  const cancelled = drawing.load('cancelled-crop', () => current);
  current = false;
  images.finish('cancelled-crop'); await cancelled;
  assert.deepEqual(sampled, ['original']);
  assert.equal(output.dataset.progress, '0');
});
