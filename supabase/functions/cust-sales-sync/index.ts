// CUST read-only receipts -> private monthly aggregates. No individual receipts are stored.
const OWNER = '5736ec73-12eb-4b2b-83e7-5b0b741e47fa';
const API = 'https://svi.ber.te.ua/cust/servise/api/v1';
const KEY_HASH = '5f8e064712ce27e05e706f86920b36e8f4ba0ad529fdb8b4e6903308de053465';
const dateInKyiv = value => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
function cents(value) {
  const s=String(value);
  if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('INVALID_MONEY');
  const [w,f='']=s.split('.');return BigInt(w)*100n+BigInt(f.padEnd(2,'0'));
}
const decimal = n => {if(n>9007199254740991n||n< -9007199254740991n)throw Error('MONEY_OVERFLOW');return (Number(n)/100).toFixed(2);};
Deno.serve(async req => {
  const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(req.headers.get('x-cust-sales-key')||'')))).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==KEY_HASH)return reply(403,{ok:false,code:'ADMIN_REQUIRED'});
  if(req.method!=='POST')return reply(405,{ok:false,code:'POST_REQUIRED'});
  const attempted=new Date().toISOString(),to=dateInKyiv(attempted),from=to.slice(0,7)+'-01';
  const db=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const headers={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
  const begun=Date.now();let token='';
  async function login(){
    const login=Deno.env.get('CUST_API_LOGIN')?.trim(),password=Deno.env.get('CUST_API_PASSWORD')?.replace(/[\r\n]+$/,'');
    if(!login||!password)throw Error('CUST_SECRETS_MISSING');
    const r=await fetch(API+'/login',{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({login,password}).toString(),signal:AbortSignal.timeout(15000)});
    if(!r.ok){await r.body?.cancel();throw Error('LOGIN_FAILED');}
    const d=await r.json();token=d?.token||d?.access_token||d?.data?.token||d?.data?.access_token;
    if(typeof token!=='string'||!token.trim())throw Error('TOKEN_FORMAT_ERROR');
  }
  async function scan(limit){
    let cursor=null,pages=0,sales=0,returns=0,gross=0n,refund=0n,asOf=null,minDate=null,maxDate=null;
    const ids=new Set(),cursors=new Set();
    do{
      if(++pages>100||Date.now()-begun>90000)throw Error('INCOMPLETE_LIMIT');
      const url=new URL(API+'/receipts');
      for(const [k,v] of Object.entries({from,to,location_id:'loc-01',limit:String(limit)}))url.searchParams.set(k,v);
      if(cursor)url.searchParams.set('cursor',cursor);
      const request=()=>fetch(url,{redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
      let r=await request();if(r.status===401){await r.body?.cancel();await login();r=await request();}
      if(!r.ok){await r.body?.cancel();throw Error('RECEIPTS_HTTP_ERROR');}
      const p=await r.json(),m=p?.meta;
      if(!Array.isArray(p?.data)||!m||typeof m.period_complete!=='boolean')throw Error('PERIOD_INCOMPLETE');
      const t=Date.parse(m.data_as_of);
      if(!Number.isFinite(t)||t>Date.now()+300000)throw Error('AS_OF_INVALID');
      asOf=asOf===null? t:Math.min(asOf,t);
      for(const row of p.data){
        if(row.location_id!=='loc-01'||row.currency!=='UAH')throw Error('LOCATION_OR_CURRENCY_MISMATCH');
        if(typeof row.receipt_id!=='string'||!row.receipt_id||ids.has(row.receipt_id))throw Error('DUPLICATE_OR_MISSING_RECEIPT');
        ids.add(row.receipt_id);
        // The API filters by accounting business_date, NOT occurred_at (late postings exist).
        const date=row.business_date;
        if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<from||date>to)throw Error('BUSINESS_DATE_OUT_OF_RANGE');
        minDate=minDate===null?date:date<minDate?date:minDate;maxDate=maxDate===null?date:date>maxDate?date:maxDate;
        const total=cents(row.total);
        if(row.type==='sale'){sales++;gross+=total;}
        else if(row.type==='return'){returns++;refund+=total;}
        else throw Error('UNKNOWN_RECEIPT_TYPE');
      }
      const next=m.next_cursor;
      if(next==null||next===''){if(m.period_complete!==true)throw Error('PERIOD_INCOMPLETE');cursor=null;break;}
      if(m.period_complete!==false)throw Error('PERIOD_INCOMPLETE');
      if(typeof next!=='string'||!p.data.length||cursors.has(next))throw Error('INVALID_CURSOR');
      cursors.add(next);cursor=next;
    }while(cursor);
    return {sales,returns,gross,refund,asOf,minDate,maxDate,pages};
  }
  try{
    if(!db||!secret)throw Error('DATABASE_CONFIG_MISSING');
    await login(); // New token every run; never persist the one-hour token.
    const a=await scan(500),b=await scan(50);
    if(['sales','returns','gross','refund','minDate','maxDate'].some(k=>a[k]!==b[k]))throw Error('VERIFICATION_MISMATCH');
    const value={user_id:OWNER,month:from,location_id:'loc-01',period_from:from,period_to:to,
      sales_count:a.sales,returns_count:a.returns,gross_sales:decimal(a.gross),returns_amount:decimal(a.refund),
      net_revenue:decimal(a.gross-a.refund),average_receipt:a.sales?decimal((a.gross+BigInt(Math.floor(a.sales/2)))/BigInt(a.sales)):null,
      currency:'UAH',data_as_of:new Date(Math.min(a.asOf,b.asOf)).toISOString(),
      last_business_date:a.maxDate,imported_at:new Date().toISOString(),last_attempt_at:attempted,
      last_error_code:null,complete:true};
    const r=await fetch(db+'/rest/v1/rpc/save_cust_sales_snapshot',{method:'POST',redirect:'error',headers,body:JSON.stringify({payload:value}),signal:AbortSignal.timeout(15000)});
    if(!r.ok){await r.body?.cancel();throw Error('DATABASE_WRITE_FAILED');}
    const saved=await r.json();if(saved!==true)throw Error('STALE_WRITE_REJECTED');
    return reply(200,{ok:true,code:'CUST_SALES_SYNC_OK',imported:true,...value,user_id:undefined,verified_pages:a.pages+b.pages});
  }catch(e){
    const allowed=['INVALID_MONEY','MONEY_OVERFLOW','CUST_SECRETS_MISSING','LOGIN_FAILED','TOKEN_FORMAT_ERROR','INCOMPLETE_LIMIT','RECEIPTS_HTTP_ERROR','PERIOD_INCOMPLETE','AS_OF_INVALID','LOCATION_OR_CURRENCY_MISMATCH','DUPLICATE_OR_MISSING_RECEIPT','BUSINESS_DATE_OUT_OF_RANGE','UNKNOWN_RECEIPT_TYPE','INVALID_CURSOR','VERIFICATION_MISMATCH','DATABASE_CONFIG_MISSING','DATABASE_WRITE_FAILED','STALE_WRITE_REJECTED'];
    const code=allowed.includes(e?.message)?e.message:'CUST_CONNECTION_OR_FORMAT_ERROR';
    try{const url=new URL(db+'/rest/v1/cust_sales_snapshots');url.searchParams.set('user_id','eq.'+OWNER);url.searchParams.set('month','eq.'+from);url.searchParams.set('location_id','eq.loc-01');url.searchParams.set('last_attempt_at','lte.'+attempted);await fetch(url,{method:'PATCH',redirect:'error',headers,body:JSON.stringify({last_attempt_at:attempted,last_error_code:code}),signal:AbortSignal.timeout(15000)});}catch{}
    return reply(502,{ok:false,code,imported:false});
  }
});
