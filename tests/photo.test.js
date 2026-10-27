const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {decodePhoto,savePhoto,loadPhoto}=require('../storage');
const handler=require('../api/for');

test('upload validation accepts prepared JPEG and rejects unsupported or oversized data',()=>{
  const photo=fs.readFileSync(path.join(__dirname,'../demo-photo.jpg'));
  assert.deepEqual(decodePhoto('data:image/jpeg;base64,'+photo.toString('base64')),photo);
  assert.equal(decodePhoto('data:image/svg+xml;base64,AAAA'),null);
  assert.equal(decodePhoto('data:image/jpeg;base64,'+Buffer.alloc(520000).toString('base64')),null);
  assert.equal(decodePhoto('data:image/jpeg;base64,YWJjZA=='),null);
});
test('a saved photo loads by its random id and cannot traverse storage',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spiral-photo-test-'));
  process.env.SPIRAL_LOCAL_UPLOADS=dir;
  try {
    const bytes=fs.readFileSync(path.join(__dirname,'../demo-photo.jpg'));
    const id=await savePhoto(bytes);
    assert.match(id,/^[a-f0-9]{32}$/); assert.deepEqual(await loadPhoto(id),bytes);
    assert.equal(await loadPhoto('../demo-photo'),null); assert.equal(await loadPhoto('0'.repeat(32)),null);
  } finally {
    delete process.env.SPIRAL_LOCAL_UPLOADS;
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'spiral-photo-test-'));
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
test('recipient response escapes names including replacement syntax, excluding notes and photos from previews',()=>{
  let html; const headers={};
  handler({url:'/f?t=Love%20%24%26%20%3C3&f=%22%3E%3Cscript%3E&n=private-note&p='+'a'.repeat(32),headers:{host:'example.test'}},{setHeader(k,v){headers[k]=v;},end(value){html=value;}});
  assert.match(html,/id="gate-name">Love \$&amp; &lt;3<\/span>/);
  assert.match(html,/From &quot;&gt;&lt;script&gt;/);
  assert.doesNotMatch(html,/private-note/); assert.ok(!html.includes('a'.repeat(32)));
  assert.equal(headers['Cache-Control'],'private, no-store');
});
