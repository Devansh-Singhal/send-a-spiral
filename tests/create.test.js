const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const Spiral=require('../core');
function creator(){
  const nodes={};
  const node=id=>nodes[id]||(nodes[id]={value:'',hidden:['result','crop-editor','custom-words-field'].includes(id),disabled:false,listeners:{},classList:{add(){},remove(){}},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(){},removeAttribute(){},focus(){},scrollIntoView(){}});
  const cards=['I love you','I like you','I miss you','custom'].map((value,i)=>({...node('card'+i),value,checked:i===0}));
  let uploads=0;const drawing={async load(){},setText(value){this.text=value;},play(){}};
  const context={Spiral,document:{getElementById:node,querySelectorAll:()=>cards},makeSpiral:()=>drawing,makePhotoCrop:()=>({}),preparePhoto:async()=> 'data:image/jpeg;base64,photo',navigator:{},location:{origin:'https://gift.test'},history:{replaceState(){}},window:{},matchMedia:()=>({matches:true}),setTimeout(){},clearTimeout(){},URL,fetch:async()=>{uploads++;return {ok:true,json:async()=>({id:'a'.repeat(32)})};}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../create.js'),'utf8'),context);
  return {node,drawing,uploads:()=>uploads,select(value){cards.forEach(card=>card.checked=card.value===value);cards.find(card=>card.checked).listeners.change();},async photo(){node('photo').files=[{}];await node('photo').listeners.change();node('to').value='Someone';},async create(){await node('create').listeners.submit({preventDefault(){}});}};
}
test('preset selection updates preview and travels in the created recipient link',async()=>{
  const view=creator();await view.photo();view.select('I miss you');assert.equal(view.drawing.text,'I miss you');
  await view.create();assert.equal(new URL(view.node('link').value).searchParams.get('w'),'I miss you');assert.equal(view.node('result').hidden,false);
  view.select('I like you');assert.equal(view.node('result').hidden,true);await view.create();
  assert.equal(new URL(view.node('link').value).searchParams.get('w'),'I like you');assert.equal(view.uploads(),1,'changing words reuses the prepared photo');
});
test('custom selection requires words and bounds Unicode without splitting characters',async()=>{
  const view=creator();await view.photo();view.select('custom');assert.equal(view.node('custom-words-field').hidden,false);
  await view.create();assert.equal(view.node('words-error').hidden,false);assert.equal(view.uploads(),0);
  view.node('custom-words').value='💕'.repeat(50);view.node('custom-words').listeners.input();
  assert.equal(view.node('custom-words').value,'💕'.repeat(40));await view.create();
  assert.equal(new URL(view.node('link').value).searchParams.get('w'),'💕'.repeat(40));
  view.select('I love you');assert.equal(view.node('custom-words-field').hidden,true);await view.create();assert.equal(new URL(view.node('link').value).searchParams.has('w'),false);
});
