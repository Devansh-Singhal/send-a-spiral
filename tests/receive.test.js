const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Spiral = require('../core');

function recipient({ reduced = false, audioFails = false } = {}) {
  const ids = ['gate-name','recipient','sender','note','signature','spiral','bgm','sound','reveal','experience','replay','photo-status','retry-photo'];
  const nodes = Object.fromEntries(ids.map(id => [id, { textContent: '', hidden: id === 'experience', listeners: {}, classList:{add(){}}, addEventListener(event, fn){ this.listeners[event] = fn; }, setAttribute(){}, focus(){} }]));
  const audio = nodes.bgm;
  Object.assign(audio, { paused:true, muted:false, currentTime:0, play(){this.paused = false; return audioFails ? Promise.reject(new Error('blocked')) : Promise.resolve();}, pause(){this.paused = true;} });
  const drawing = {progress:0,plays:0,async load(){},still(p){this.progress=p;},play(){this.plays++;this.progress = reduced ? 1 : .01;}};
  const document = {title:'',hidden:false,listeners:{},getElementById:id=>nodes[id], addEventListener(event,fn){this.listeners[event]=fn;}};
  const context = {Spiral,URLSearchParams,location:{search:'?t=Love&p='+'a'.repeat(32)},document,makeSpiral:()=>drawing,setTimeout:()=>0,window:{addEventListener(){}},Promise};
  const file = path.join(__dirname,'../receive.js');
  assert.ok(fs.existsSync(file), 'recipient controller must exist');
  vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  return {nodes,audio,drawing,document};
}

test('recipient has zero drawing and no audio before opening', async () => {
  const {nodes,audio,drawing}=recipient(); await Promise.resolve();
  assert.equal(drawing.progress,0); assert.equal(drawing.plays,0); assert.equal(audio.paused,true); assert.equal(nodes.experience.hidden,true);
});
test('opening and replay start drawing and rewind music', async () => {
  const {nodes,audio,drawing}=recipient(); await new Promise(setImmediate);
  nodes.reveal.listeners.click();
  assert.equal(drawing.plays,1); assert.equal(audio.paused,false); assert.equal(nodes.experience.hidden,false);
  audio.currentTime=5; nodes.replay.listeners.click();
  assert.equal(audio.currentTime,0); assert.equal(drawing.plays,2);
});
test('blocked audio keeps visual usable and offers retry', async () => {
  const {nodes,drawing}=recipient({audioFails:true}); await new Promise(setImmediate); nodes.reveal.listeners.click(); await new Promise(setImmediate);
  assert.equal(drawing.plays,1); assert.equal(nodes.sound.textContent,'Turn sound on');
});
test('muting and hiding pause audio without unmuting it on return', async () => {
  const {nodes,audio,document}=recipient(); await new Promise(setImmediate); nodes.reveal.listeners.click(); nodes.sound.listeners.click();
  assert.equal(audio.muted,true); document.hidden=true; document.listeners.visibilitychange(); assert.equal(audio.paused,true);
  document.hidden=false; document.listeners.visibilitychange(); assert.equal(audio.paused,true); assert.equal(audio.muted,true);
});
