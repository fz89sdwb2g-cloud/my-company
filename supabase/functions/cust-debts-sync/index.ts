Deno.serve(async req=>{
 const reply=(status,data)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
 const h=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(req.headers.get("x-cust-sync-key")||"")))).map(x=>x.toString(16).padStart(2,"0")).join("");
 if(h!=="35b372785aa43b5d1c2a7722b01cdb468369eb9a4a334396171f111c28abd627")return reply(403,{ok:false,code:"ADMIN_REQUIRED",imported:false});
 if(req.method!=="POST")return reply(405,{ok:false,code:"POST_REQUIRED",imported:false});
 // No configured receivables source exists in CUST API v1. No financial values are written.
 return reply(503,{ok:false,code:"CUST_DEBTS_SOURCE_NOT_CONNECTED",imported:false});
});