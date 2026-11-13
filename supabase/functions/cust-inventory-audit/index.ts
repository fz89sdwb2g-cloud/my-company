Deno.serve(async (req) => {
  let syncAuthorized = false;
  const attemptedAt = new Date().toISOString();
  async function patchSnapshot() {}
  const reply = async (status, data) => {
    if (syncAuthorized && status >= 400) {
      try {await patchSnapshot({last_attempt_at:attemptedAt,last_error_code:data.code});} catch {}
    }
    return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
  };

  const keys = [Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")];
  try {
    const named = JSON.parse(
      Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"
    );
    if (typeof named.default === "string") {
      keys.push(named.default);
    }
  } catch {}

  const bearer = req.headers.get("Authorization")
    ?.replace(/^Bearer\s+/i, "");
  const apiKey = req.headers.get("apikey");

  const syncKey = req.headers.get("x-cust-sync-key") || "";
  const syncHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(syncKey)))).map(b=>b.toString(16).padStart(2,"0")).join("");
  const cronAuthorized = syncHash === "35b372785aa43b5d1c2a7722b01cdb468369eb9a4a334396171f111c28abd627";
  if (!cronAuthorized && !keys.some(key =>
    key && (key === bearer || key === apiKey)
  )) {
    return reply(403, {
      ok: false, code: "ADMIN_REQUIRED"
    });
  }

  if (req.method !== "POST") {
    return reply(405, {
      ok: false, code: "POST_REQUIRED"
    });
  }
 syncAuthorized = true;
 const login = Deno.env.get("CUST_API_LOGIN")?.trim();
const password = Deno.env.get("CUST_API_PASSWORD")?.replace(/[\r\n]+$/, "");

  if (!login || !password) {
    return reply(503, {
      ok: false, code: "CUST_SECRETS_MISSING"
    });
  }

  try {
    await patchSnapshot({last_attempt_at:attemptedAt,last_error_code:null});
    const result = await fetch(
      "https://svi.ber.te.ua/cust/servise/api/v1/login",
      {
        method: "POST",
        redirect: "error",
        headers: {
         "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: new URLSearchParams({ login, password }).toString(),
        signal: AbortSignal.timeout(15000)
      }
    );

    if (!result.ok) {
      await result.body?.cancel();
      return reply(502, {
        ok: false,
        code: "CUST_LOGIN_HTTP_ERROR",
        upstream_status: result.status
      });
    }

    const data = await result.json();
    let token = data?.access_token || data?.token ||
      data?.data?.access_token || data?.data?.token;

    if (typeof token !== "string" || !token.trim()) {
      return reply(502, {
        ok: false, code: "CUST_TOKEN_FORMAT_UNKNOWN"
      });
    }

    const locationsResponse = await fetch(
  "https://svi.ber.te.ua/cust/servise/api/v1/locations",
  {
    method: "GET",
    redirect: "error",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(15000)
  }
);

if (!locationsResponse.ok) {
  await locationsResponse.body?.cancel();
  return reply(502, {
    ok: false,
    code: "CUST_LOCATIONS_HTTP_ERROR",
    upstream_status: locationsResponse.status
  });
}

const payload = await locationsResponse.json();
const locations = [
  payload,
  payload?.locations,
  payload?.data,
  payload?.data?.locations
].find(Array.isArray);

if (!locations) {
  return reply(502, {
    ok: false,
    code: "CUST_LOCATIONS_FORMAT_UNKNOWN"
  });
}


const definitions=new Map();
{
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 for(let offset=0;offset<100000;offset+=1000){
  const url=new URL(base+"/rest/v1/cust_inventory_classification");
  for(const [k,v]of Object.entries({select:"product_id,definition_hash,item_kind",user_id:"eq.5736ec73-12eb-4b2b-83e7-5b0b741e47fa",location_id:"eq.loc-01",order:"product_id",limit:"1000",offset:String(offset)}))url.searchParams.set(k,v);
  const r=await fetch(url,{redirect:"error",headers:{apikey:key,Authorization:"Bearer "+key},signal:AbortSignal.timeout(15000)});
  if(!r.ok){await r.body?.cancel();throw Error("CLASSIFICATION_READ_FAILED");}
  const rows=await r.json();if(!Array.isArray(rows))throw Error("CLASSIFICATION_READ_FAILED");
  for(const row of rows)definitions.set(row.product_id,row);
  if(rows.length<1000)break;
 }
 if(!definitions.size)throw Error("CLASSIFICATION_MISSING");
}
let catalogueCents=0n,excludedCents=0n,unclassifiedCents=0n;
let catalogueCount=0,excludedCount=0,unclassifiedCount=0;
const excludedKinds={palette:0,delivery:0,service:0};
const decimal=n=>{if(n>9007199254740991n||n< -9007199254740991n)throw Error("INVALID_MONEY");return (Number(n)/100).toFixed(2);};

const begun = Date.now();
const seenCursors = new Set();
const seenProducts = new Set();
let cursor = null, snapshot = null, asOf = null, cents = 0n;
let count = 0, pages = 0, negative = 0, zero = 0;
function moneyCents(value) {
  const text = String(value);
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) throw Error("INVALID_MONEY");
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  const n = BigInt(whole) * 100n + BigInt(fraction.padEnd(2,"0"));
  return negative ? -n : n;
}
async function renewToken() {
  const r = await fetch("https://svi.ber.te.ua/cust/servise/api/v1/login", {
    method:"POST", redirect:"error",
    headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},
    body:new URLSearchParams({login,password}).toString(),
    signal:AbortSignal.timeout(15000)
  });
  if (!r.ok) throw Error("LOGIN_RETRY_FAILED");
  const d = await r.json();
  const t = d?.token || d?.access_token || d?.data?.token || d?.data?.access_token;
  if (typeof t !== "string" || !t.trim()) throw Error("INVALID_TOKEN");
  token = t;
}
do {
  if (++pages > 100 || Date.now()-begun > 90000) throw Error("INCOMPLETE_LIMIT");
  const url = new URL("https://svi.ber.te.ua/cust/servise/api/v1/inventory");
  url.searchParams.set("location_id","loc-01");
  url.searchParams.set("limit","200");
  if (cursor !== null) url.searchParams.set("cursor",cursor);
  const request = () => fetch(url, {
    method:"GET",redirect:"error",
    headers:{Authorization:`Bearer ${token}`,Accept:"application/json"},
    signal:AbortSignal.timeout(15000)
  });
  let r = await request();
  if (r.status === 401) {
    await r.body?.cancel();
    await renewToken();
    r = await request();
  }
  if (!r.ok) {
    await r.body?.cancel();
    return reply(502,{ok:false,code:"CUST_INVENTORY_HTTP_ERROR",upstream_status:r.status});
  }
  const p = await r.json();
  if (!Array.isArray(p?.data) || !p?.meta) throw Error("UNKNOWN_PAGINATION");
  if (!p.meta.snapshot_id || !p.meta.as_of || !Number.isFinite(Date.parse(p.meta.as_of)))
    throw Error("MISSING_SNAPSHOT");
  if (snapshot === null) {snapshot=p.meta.snapshot_id;asOf=p.meta.as_of;}
  if (snapshot !== p.meta.snapshot_id || asOf !== p.meta.as_of)
    throw Error("SNAPSHOT_CHANGED");
  for (const item of p.data) {
    if (item.location_id !== "loc-01" || item.currency !== "UAH")
      throw Error("LOCATION_OR_CURRENCY_MISMATCH");
    const product=String(item.product_id ?? "");
    if (!product || seenProducts.has(product)) throw Error("DUPLICATE_PRODUCT");
    seenProducts.add(product);
    const quantity=Number(item.quantity_on_hand), unitCost=Number(item.unit_cost);
    if (item.quantity_on_hand == null || item.unit_cost == null ||
        !Number.isFinite(quantity) || !Number.isFinite(unitCost) || unitCost < 0)
      throw Error("INVALID_QUANTITY_OR_COST");
    const line=moneyCents(item.stock_cost);
    if (Math.abs(quantity*unitCost-Number(line)/100)>0.011)
      throw Error("LINE_COST_MISMATCH");

    catalogueCents+=line;catalogueCount++;
     const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(item.name)+"\\0"+item.unit)))).map(b=>b.toString(16).padStart(2,"0")).join("");
    const entry=definitions.get(product);
    const kind=entry?.definition_hash===digest?entry.item_kind:"unclassified";
    if(["palette","delivery","service"].includes(kind)){excludedCents+=line;excludedCount++;excludedKinds[kind]++;continue;}
    if(kind!=="stock"){unclassifiedCents+=line;unclassifiedCount++;continue;}
    cents += line;count++;
    if(quantity<0)negative++;
    if(quantity===0)zero++;
  }
  const next=p.meta.next_cursor;
  if (next == null || next === "") {cursor=null;break;}
  if (!["string","number"].includes(typeof next) || !p.data.length)
    throw Error("INVALID_CURSOR");
  cursor=String(next);
  if(seenCursors.has(cursor))throw Error("REPEATED_CURSOR");
  seenCursors.add(cursor);
} while(cursor !== null);
if (count === 0) throw Error("EMPTY_INVENTORY_REVIEW_REQUIRED");
if (Date.parse(asOf) > Date.now() + 300000) throw Error("INVALID_SNAPSHOT_DATE");
if(cents>9007199254740991n||cents< -9007199254740991n)throw Error("INVALID_MONEY");
const total = (Number(cents)/100).toFixed(2);
const importedAt = new Date().toISOString();
const valuationDetails={method:"reviewed_product_classification_v1",catalogue_count:catalogueCount,catalogue_stock_cost:decimal(catalogueCents),excluded_count:excludedCount,excluded_stock_cost:decimal(excludedCents),unclassified_count:unclassifiedCount,unclassified_stock_cost:decimal(unclassifiedCents),excluded_kinds:excludedKinds};
if(cents+excludedCents+unclassifiedCents!==catalogueCents||count+excludedCount+unclassifiedCount!==catalogueCount)throw Error("CLASSIFICATION_RECONCILIATION_FAILED");
await patchSnapshot({
  stock_cost:total,currency:"UAH",product_count:count,
  negative_quantity_count:negative,snapshot_id:snapshot,as_of:asOf,
  imported_at:importedAt,last_attempt_at:attemptedAt,last_error_code:null,
  complete:true,valuation_details:valuationDetails
},asOf);
return reply(200,{
  ok:true,code:"CUST_STORES_CLASSIFIED_AUDIT_OK",imported:false,
  location_id:"loc-01",product_count:count,stock_cost:total,valuation_details:valuationDetails,
  currency:"UAH",as_of:asOf,imported_at:importedAt
});
  } catch (error) {
    const allowed = ["CLASSIFICATION_READ_FAILED","CLASSIFICATION_MISSING","CLASSIFICATION_RECONCILIATION_FAILED","INVALID_MONEY","LOGIN_RETRY_FAILED","INVALID_TOKEN","INCOMPLETE_LIMIT","UNKNOWN_PAGINATION","MISSING_SNAPSHOT","SNAPSHOT_CHANGED","LOCATION_OR_CURRENCY_MISMATCH","DUPLICATE_PRODUCT","INVALID_QUANTITY_OR_COST","LINE_COST_MISMATCH","INVALID_CURSOR","REPEATED_CURSOR","SYNC_DATABASE_CONFIG_MISSING","SYNC_DATABASE_WRITE_FAILED","SYNC_STALE_OR_MISSING_ROW","EMPTY_INVENTORY_REVIEW_REQUIRED","INVALID_SNAPSHOT_DATE"];
    return reply(502, {ok:false,code:allowed.includes(error?.message)?error.message:"CUST_CONNECTION_OR_FORMAT_ERROR"});
  }
});
