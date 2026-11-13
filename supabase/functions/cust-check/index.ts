Deno.serve(async (req) => {
  const reply = (status, data) => Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

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

  if (!keys.some(key =>
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
 const login = Deno.env.get("CUST_API_LOGIN")?.trim();
const password = Deno.env.get("CUST_API_PASSWORD")?.replace(/[\r\n]+$/, "");

  if (!login || !password) {
    return reply(503, {
      ok: false, code: "CUST_SECRETS_MISSING"
    });
  }

  try {
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
  url.searchParams.set("location_id","loc-02");
  url.searchParams.set("limit","500");
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
    if (item.location_id !== "loc-02" || item.currency !== "UAH")
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
return reply(200,{
  ok:true,code:"CUST_WAREHOUSE_TOTAL",imported:false,
  location_id:"loc-02",complete:true,
  as_of:asOf,snapshot_id:snapshot,
  product_count:count,pages,negative_quantity_count:negative,zero_quantity_count:zero,
  stock_cost:(Number(cents)/100).toFixed(2),currency:"UAH"
});
  } catch (error) {
    const allowed = ["INVALID_MONEY","LOGIN_RETRY_FAILED","INVALID_TOKEN","INCOMPLETE_LIMIT","UNKNOWN_PAGINATION","MISSING_SNAPSHOT","SNAPSHOT_CHANGED","LOCATION_OR_CURRENCY_MISMATCH","DUPLICATE_PRODUCT","INVALID_QUANTITY_OR_COST","LINE_COST_MISMATCH","INVALID_CURSOR","REPEATED_CURSOR"];
    return reply(502, {ok:false,code:allowed.includes(error?.message)?error.message:"CUST_CONNECTION_OR_FORMAT_ERROR"});
  }
});