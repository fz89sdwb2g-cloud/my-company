const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const source=fs.readFileSync(__dirname+'/../supabase/functions/cust-analysis-sync/index.ts','utf8').replace('5f8e064712ce27e05e706f86920b36e8f4ba0ad529fdb8b4e6903308de053465',crypto.createHash('sha256').update('test').digest('hex'));
const response=x=>Response.json(x);
async function run(date,mode='ok'){
 class Clock extends Date{constructor(...a){super(...(a.length?a:[date]));}static now(){return new Date(date).getTime();}}
 let handler,payload,writes=0,logins=0,gets=0;
 const hash=crypto.createHash('sha256').update('Synthetic stock\\0pcs').digest('hex');
 const fetch=async(url,o={})=>{const u=new URL(url);
 if(u.pathname.endsWith('/login')){logins++;return response({token:'secret-test'});}
 if(u.pathname.endsWith('/cust_inventory_classification'))return response([{product_id:'p1',definition_hash:hash,item_kind:'stock'}]);
 if(u.pathname.endsWith('/receipts')){gets++;if(mode==='expired'&&gets===1)return new Response('',{status:401});const from=u.searchParams.get('from'),to=u.searchParams.get('to');const data=[{receipt_id:from,location_id:'loc-01',business_date:from,type:'sale',total:'10.01',currency:'UAH'}];if(mode==='out-of-range')data[0].business_date=to;if(mode==='mismatch'&&u.searchParams.get('limit')==='100')data[0].total='10.02';return response({data,meta:{period_complete:mode!=='incomplete',data_as_of:date,next_cursor:null}});}
 if(u.pathname.endsWith('/inventory')){const loc=u.searchParams.get('location_id');return response({data:[{product_id:loc==='loc-01'?'p1':'p2',location_id:loc,name:loc==='loc-01'?'Synthetic stock':'Unknown',unit:'pcs',quantity_on_hand:loc==='loc-01'?'-2':'1',unit_cost:'3.00',stock_cost:loc==='loc-01'?'-6.00':'3.00',currency:'UAH'},...(loc==='loc-01'?[{product_id:'new',location_id:loc,name:'Synthetic new',unit:'pcs',quantity_on_hand:'1',unit_cost:'0',stock_cost:'0',currency:'UAH'}]:[])],meta:{snapshot_id:loc,as_of:date,next_cursor:null}});}
 if(u.pathname.endsWith('/save_cust_analysis')){writes++;payload=JSON.parse(o.body).p_payload;return response(true);}
 assert.equal(o.method,'PATCH');assert(!Object.hasOwn(JSON.parse(o.body),'payload'));return response(null);};
 vm.runInNewContext(source,{Date:Clock,Intl,URL,URLSearchParams,Response,TextEncoder,crypto:crypto.webcrypto,AbortSignal,fetch,Deno:{env:{get:k=>({SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'service',CUST_API_LOGIN:'login',CUST_API_PASSWORD:'password'})[k]},serve:f=>handler=f}});
 const r=await handler(new Request('https://fn.example',{method:'POST',headers:{'x-cust-sales-key':mode==='unauthorized'?'bad':'test'}}));
 if(['ok','expired'].includes(mode)){assert.equal(r.status,200,JSON.stringify(await r.clone().json()));assert.equal(writes,1);assert.equal(payload.inventory.stats[0].counts.negative_quantity,1);assert.equal(payload.inventory.stats[0].counts.unclassified,1);assert.equal(payload.sales.daily.length,14);assert(!JSON.stringify(payload).includes('secret-test'));assert.equal(payload.sales.periods[0].days,7);if(date.startsWith('2026-03-31'))assert.equal(payload.sales.month_days_comparable,false);if(date.startsWith('2026-12-01'))assert.equal(payload.sales.periods[2].days,0);if(mode==='expired')assert.equal(logins,2);}
 else{assert.equal(writes,0);assert.equal(r.status,mode==='unauthorized'?403:502);}
 console.log(date,mode,'passed');return payload;
}
(async()=>{for(const m of ['ok','expired','out-of-range','mismatch','incomplete','unauthorized'])await run('2026-11-14T19:00:00Z',m);await run('2026-03-31T19:00:00Z');await run('2026-12-01T12:00:00Z');
 const p=await run('2026-11-14T19:00:00Z');let auth,pending=[];const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{value:id==='owner-month'?'2026-11':'',children:[],append(x){this.children.push(x)},replaceChildren(){this.children=[]}});return nodes.get(id);}
 const cloud={auth:{onAuthStateChange:f=>auth=f,getSession:()=>new Promise(()=>{})},from:t=>{assert.equal(t,'cust_analysis_snapshots');const q={select:()=>q,eq:(k,v)=>{assert.equal(v,'owner');return q},maybeSingle:async()=>({data:{payload:p,generated_at:p.generated_at},error:null})};return q;}};
 const window={addEventListener(){}};vm.runInNewContext(fs.readFileSync(__dirname+'/../js/cust-analysis.js','utf8'),{document:{getElementById:node,createElement:()=>node('created'+nodes.size)},cloud,window,Intl,Date,setTimeout:f=>pending.push(f),setInterval(){}});
 auth('SIGNED_IN',{user:{id:'owner'}});await pending.shift()();assert(node('cust-analysis-stock').children.length>0);auth('SIGNED_OUT',null);assert.equal(node('cust-analysis-stock').children.length,0);node('owner-month').value='2020-01';window.CustAnalysis.render();assert.equal(node('cust-operational-analysis').hidden,true);console.log('UI private load, logout clearing and month isolation passed');
})().catch(e=>{console.error(e);process.exit(1)});
