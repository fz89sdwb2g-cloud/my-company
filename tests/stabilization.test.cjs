// Run: node tests/stabilization.test.cjs (requires Playwright and Chromium).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');res.end(data);});
});
const staffKey='myCompanyStaff_v13',marketKey='myCompanyMarket_v1';
const marketSeed={competitors:[{id:1,name:'Магазин',products:[{id:2,name:'Клей',unit:'мішок'}],checks:[{id:3,date:'2026-10-01',next:'',prices:{2:100}}]}],manufacturers:[]};
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  let count=0;
  async function test(name,fn){await fn();console.log('PASS '+name);count++;}
  async function pageFor(file,key,raw){
    const context=await browser.newContext(),page=await context.newPage();
    page.answers=[];page.errors=[];
    page.on('pageerror',e=>page.errors.push(e.message));
    page.on('dialog',d=>{const answer=page.answers.shift();return answer===null?d.dismiss():d.accept(answer===undefined?'':String(answer));});
    await page.goto(origin+'/README.md');
    if(raw!==undefined)await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw});
    await page.goto(origin+'/'+file);
    return page;
  }
  async function read(page,key){return page.evaluate(k=>localStorage.getItem(k),key);}
  try {
    await test('staff add, edit, cancel, audit, pay and reload',async()=>{
      const p=await pageFor('staff-test.html');
      await p.click('[data-t="work"]');await p.fill('#wq','2');await p.fill('#wc','Чек 1');await p.click('#addwork');
      let s=JSON.parse(await read(p,staffKey));assert.equal(s.works[0].amount,80);
      p.answers=['3','Чек 1 виправлено','Помилка кількості'];await p.click('[data-editwork]');
      s=JSON.parse(await read(p,staffKey));assert.equal(s.works[0].amount,120);assert.equal(s.audit[0].before.qty,2);
      await p.click('[data-t="shift"]');assert.match(await p.textContent('#salaryview'),/120/);
      await p.click('[data-t="work"]');p.answers=['Подвійний запис',''];await p.click('[data-voidwork]');
      s=JSON.parse(await read(p,staffKey));assert.equal(s.works[0].voided,true);assert.equal(s.audit.length,2);
      await p.reload();assert.match(await p.textContent('#salaryview'),/^0/);assert.deepEqual(p.errors,[]);
      const download=p.waitForEvent('download');await p.click('#exportStaff');const d=await download;
      const backup=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.equal(backup.key,staffKey);assert.equal(backup.data.audit.length,2);
      await p.context().close();
    });
    for(const [file,key,button] of [['staff-test.html',staffKey,'#start'],['market-test.html',marketKey,'#addEntity']]){
      for(const raw of ['{broken','null','[]','{"unexpected":true}'])await test(file+' preserves invalid '+raw,async()=>{
        const p=await pageFor(file,key,raw);
        if(key===marketKey)await p.fill('#name','Тест');
        await p.click(button);assert.equal(await read(p,key),raw);assert.match(await p.textContent('#storageNotice'),/заблоковано/);assert.deepEqual(p.errors,[]);
        await p.context().close();
      });
      await test(file+' quota failure leaves previous data intact',async()=>{
        const p=await pageFor(file,key,key===marketKey?JSON.stringify(marketSeed):undefined),before=await read(p,key);
        await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
        if(key===marketKey)await p.fill('#name','Тест');await p.click(button);
        assert.equal(await read(p,key),before);assert.match(await p.textContent('#storageNotice'),/переповнене/);assert.deepEqual(p.errors,[]);await p.context().close();
      });
      await test(file+' protects another tab update',async()=>{
        const p=await pageFor(file,key,key===marketKey?JSON.stringify(marketSeed):undefined);
        await p.evaluate(k=>localStorage.setItem(k,'{"fromOtherTab":true}'),key);
        if(key===marketKey)await p.fill('#name','Тест');await p.click(button);
        assert.equal(await read(p,key),'{"fromOtherTab":true}');assert.match(await p.textContent('#storageNotice'),/іншій вкладці/);await p.context().close();
      });
    }
    await test('market preserves history and validates price and cancellation',async()=>{
      const p=await pageFor('market-test.html',marketKey,JSON.stringify(marketSeed));
      p.answers=['110,5','2026-11-10'];await p.click('[data-action="check"]');
      let data=JSON.parse(await read(p,marketKey));assert.equal(data.competitors[0].checks.length,2);assert.equal(data.competitors[0].checks[0].prices[2],100);assert.equal(data.competitors[0].checks[1].prices[2],110.5);
      const before=await read(p,marketKey);
      p.answers=['abc'];await p.click('[data-action="check"]');assert.equal(await read(p,marketKey),before);
      p.answers=[null];await p.click('[data-action="check"]');assert.equal(await read(p,marketKey),before);
      await p.reload();assert.match(await p.textContent('#list'),/110.5/);assert.deepEqual(p.errors,[]);await p.context().close();
    });
    await test('imports reject wrong module, malformed data and cancelled confirmation',async()=>{
      const p=await pageFor('market-test.html',marketKey,JSON.stringify(marketSeed));const before=await read(p,marketKey);
      async function upload(data){await p.setInputFiles('#importMarket',{name:'backup.json',mimeType:'application/json',buffer:Buffer.from(data)});await p.waitForFunction(()=>document.querySelector('#importMarket').value==='');}
      await upload('{broken');assert.equal(await read(p,marketKey),before);
      await upload(JSON.stringify({format:'my-company-backup',version:1,key:staffKey,data:marketSeed}));assert.equal(await read(p,marketKey),before);
      p.answers=[null];await upload(JSON.stringify(marketSeed));assert.equal(await read(p,marketKey),before);assert.deepEqual(p.errors,[]);await p.context().close();
    });
    for(const [file,key,input,exportButton] of [['staff-test.html',staffKey,'#importStaff','#exportStaff'],['market-test.html',marketKey,'#importMarket','#exportMarket']]){
      await test(file+' recovery exports original bytes and restores valid backup',async()=>{
        // Get a validated staff backup from a fresh ordinary write.
        let data=marketSeed;
        if(key===staffKey){const seed=await pageFor(file);await seed.click('#start');data=JSON.parse(await read(seed,key));await seed.context().close();}
        const p=await pageFor(file,key,'{broken');
        let pending=p.waitForEvent('download');await p.click(exportButton);let d=await pending;assert.equal(fs.readFileSync(await d.path(),'utf8'),'{broken');
        pending=p.waitForEvent('download');
        await p.setInputFiles(input,{name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'my-company-backup',version:1,key,data}))});
        d=await pending;assert.equal(fs.readFileSync(await d.path(),'utf8'),'{broken');
        await p.waitForFunction(({key})=>JSON.parse(localStorage.getItem(key))!==null,{key});
        assert.deepEqual(JSON.parse(await read(p,key)),data);assert.match(await p.textContent('#storageNotice'),/відновлено/);assert.deepEqual(p.errors,[]);await p.context().close();
      });
    }
    console.log(count+' browser scenarios passed');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
