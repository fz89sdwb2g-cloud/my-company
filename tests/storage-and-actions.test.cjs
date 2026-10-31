// Run with jsdom installed: node tests/storage-and-actions.test.cjs
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const staffKey='myCompanyStaff_v13',marketKey='myCompanyMarket_v1';
const seed={competitors:[{id:1,name:'Магазин',products:[{id:2,name:'Клей',unit:'мішок'}],checks:[{id:3,date:'2026-10-01',next:'',prices:{2:100}}]}],manufacturers:[]};
function setup(kind,raw){
 const file=kind==='staff'?'staff-test.html':'market-test.html',key=kind==='staff'?staffKey:marketKey;
 const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:'https://test.invalid/',runScripts:'outside-only'}),w=dom.window;
 const errors=[],answers=[],downloads=[];w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault();});
 w.alert=()=>{};w.confirm=()=>answers.length?answers.shift()!==false:true;w.prompt=()=>answers.length?answers.shift():null;
 w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 if(raw!==undefined)w.localStorage.setItem(key,raw);
 w.eval(fs.readFileSync(path.join(root,'modules/safe-store.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(root,'modules',kind==='staff'?'staff-v136-restored.js':'market-restored.js'),'utf8'));
 if(kind==='staff')w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const $=id=>w.document.getElementById(id),click=selector=>{const e=w.document.querySelector(selector);assert.ok(e,selector);e.click();assert.equal(errors.length,0,String(errors));};
 return {w,$,click,key,answers,downloads,read:()=>w.localStorage.getItem(key),close:()=>w.close()};
}
let count=0;
async function test(name,fn){await fn();console.log('PASS '+name);count++;}
(async()=>{
 await test('staff work correction and cancellation preserve audit and update pay',()=>{
  const p=setup('staff');p.$('wq').value='2';p.$('wc').value='<img src=x onerror=alert(1)>';p.click('#addwork');
  assert.equal(p.w.document.querySelectorAll('#worklog img').length,0);
  p.answers.push('3','Чек 1','Помилка кількості');p.click('[data-editwork]');let s=JSON.parse(p.read());
  assert.equal(s.works[0].amount,120);assert.equal(s.audit[0].before.qty,2);assert.match(p.$('salaryview').textContent,/120/);
  p.answers.push('Повторний запис',true);p.click('[data-voidwork]');s=JSON.parse(p.read());assert.equal(s.works[0].voided,true);assert.equal(s.audit.length,2);assert.match(p.$('salaryview').textContent,/^0/);p.close();
 });
 for(const kind of ['staff','market']){
  for(const raw of ['{broken','null','[]','{"unexpected":true}'])await test(kind+' invalid storage stays byte-identical: '+raw,()=>{
   const p=setup(kind,raw);if(kind==='market')p.$('name').value='Тест';p.click(kind==='staff'?'#start':'#addEntity');assert.equal(p.read(),raw);assert.match(p.$('storageNotice').textContent,/заблоковано/);p.close();
  });
  await test(kind+' quota failure leaves data unchanged',()=>{
   const p=setup(kind,kind==='market'?JSON.stringify(seed):undefined),before=p.read();
   p.w.Storage.prototype.setItem=function(){throw new Error('QuotaExceededError');};if(kind==='market')p.$('name').value='Тест';p.click(kind==='staff'?'#start':'#addEntity');assert.equal(p.read(),before);assert.match(p.$('storageNotice').textContent,/переповнене/);p.close();
  });
  await test(kind+' stale page cannot overwrite another tab',()=>{
   const p=setup(kind,kind==='market'?JSON.stringify(seed):undefined);p.w.localStorage.setItem(p.key,'{"otherTab":true}');if(kind==='market')p.$('name').value='Тест';p.click(kind==='staff'?'#start':'#addEntity');assert.equal(p.read(),'{"otherTab":true}');assert.match(p.$('storageNotice').textContent,/іншій вкладці/);p.close();
  });
 }
 await test('market appends history and retains both tabs across reload',()=>{
  const p=setup('market',JSON.stringify(seed));p.answers.push('110,5','2026-11-10');p.click('[data-action="check"]');
  let s=JSON.parse(p.read());assert.equal(s.competitors[0].checks.length,2);assert.equal(s.competitors[0].checks[0].prices[2],100);assert.equal(s.competitors[0].checks[1].prices[2],110.5);
  p.click('[data-tab="manufacturers"]');p.$('name').value='Виробник';p.click('#addEntity');const raw=p.read();p.close();const q=setup('market',raw);assert.match(q.$('list').textContent,/110.5/);assert.equal(JSON.parse(q.read()).manufacturers.length,1);q.close();
 });
 await test('market invalid price, bad date and cancelled prompts do not write',()=>{
  const p=setup('market',JSON.stringify(seed)),before=p.read();for(const answers of [['abc'],['-1'],['100','2026-02-31'],[null]]){p.answers.push(...answers);p.click('[data-action="check"]');assert.equal(p.read(),before);}p.close();
 });
 for(const kind of ['staff','market'])await test(kind+' recovery, export and safe import',async()=>{
  let data=seed;if(kind==='staff'){const p=setup('staff');p.click('#start');data=JSON.parse(p.read());p.close();}
  const p=setup(kind,'{broken'),store=p.w.CompanyStore.create(p.key,kind==='staff'?p.w.CompanyStore.staff:p.w.CompanyStore.market,()=>data);
  store.exportFile();assert.equal(p.downloads.length,1);
  async function upload(value){return store.importFile({text:async()=>value});}
  await assert.rejects(upload('{bad'));assert.equal(p.read(),'{broken');
  await assert.rejects(upload(JSON.stringify({format:'my-company-backup',version:1,key:'wrong',data})));assert.equal(p.read(),'{broken');
  p.answers.push(false);assert.equal(await upload(JSON.stringify(data)),null);assert.equal(p.read(),'{broken');
  const restored=await upload(JSON.stringify({format:'my-company-backup',version:1,key:p.key,data}));assert.equal(JSON.stringify(restored),JSON.stringify(data));assert.equal(p.read(),JSON.stringify(data));assert.equal(p.downloads.length,2);assert.equal(store.message,'');p.close();
 });
 await test('import detects concurrent update and storage failure',async()=>{
  const p=setup('market',JSON.stringify(seed)),store=p.w.CompanyStore.create(marketKey,p.w.CompanyStore.market,()=>seed);
  await assert.rejects(store.importFile({text:async()=>{p.w.localStorage.setItem(marketKey,'{"external":true}');return JSON.stringify(seed);}}));assert.equal(p.read(),'{"external":true}');
  p.w.Storage.prototype.setItem=function(){throw new Error('QuotaExceededError');};await assert.rejects(store.importFile({text:async()=>JSON.stringify(seed)}));assert.equal(p.read(),'{"external":true}');p.close();
 });
 console.log(count+' DOM and storage scenarios passed (not visual browser acceptance)');
})().catch(e=>{console.error(e);process.exitCode=1;});
