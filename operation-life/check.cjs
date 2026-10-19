const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now='2026-10-19T12:00:00Z';class Clock extends Date{constructor(...a){super(...(a.length?a:[now]))}static now(){return new Date(now).valueOf()}}
const nodes=new Map();function node(){return {textContent:'',innerHTML:'',hidden:false,style:{},dataset:{},value:'',files:[],classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){this[type]=fn},appendChild(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false},click(){}}}
const storage=new Map();const context=vm.createContext({console,Date:Clock,crypto:require('node:crypto').webcrypto,setTimeout(){},clearTimeout(){},setInterval(){},Blob,URL,FormData,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll:()=>[],createElement:node,addEventListener(){}},window:{addEventListener(){}}});
vm.runInContext(fs.readFileSync(__dirname+'/dist/app.js','utf8'),context);const run=s=>vm.runInContext(s,context);
assert.equal(run('valid(state)'),true);
run('advance(state.tasks[0].id)');assert.equal(run('balance()'),100);run('advance(state.tasks[0].id)');assert.equal(run('balance()'),100);
run('advance(state.tasks[1].id)');assert.equal(run('balance()'),100);run('advance(state.tasks[1].id)');assert.equal(run('balance()'),250);
// Exercise actual reward click and confirmation handlers.
run("$('#content').click({target:{closest:()=>({dataset:{action:'redeem',id:state.rewards[0].id}})}}); $('#confirm-ok').onclick()");assert.equal(run('balance()'),50);assert.equal(run("state.logs.at(-1).kind"),'redeem');
run("$('#content').click({target:{closest:()=>({dataset:{action:'redeem',id:state.rewards[0].id}})}}); $('#confirm-ok').onclick()");assert.equal(run('balance()'),50);
now='2026-10-20T00:00:01Z';assert.equal(run('done(state.tasks[0])'),false);run('advance(state.tasks[0].id)');assert.equal(run('balance()'),150);
run('advance(state.tasks[4].id)');now='2026-10-21T12:00:00Z';assert.equal(run('progress(state.tasks[4])'),1);
assert.equal(run('valid(JSON.parse(JSON.stringify(state)))'),true);assert.equal(run('valid({version:1})'),false);
assert.equal(run("esc('<img onerror=alert(1)>').includes('<')"),false);
run("localStorage.setItem=()=>{throw new Error('quota')}");const before=run('balance()');run('advance(state.tasks[0].id)');assert.equal(run('balance()'),before);assert.equal(run('done(state.tasks[0])'),false);
console.log('PASS: daily reset, multi-step completion, duplicate prevention, redemption, insufficient balance, season persistence, backup validation, escaping, storage failure rollback.');
