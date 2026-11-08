import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const appOrigin = "https://fz89sdwb2g-cloud.github.io";
const headers = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
const columns = "id,created_at,prompt,answer,status";
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const role = "Ти AI-асистент власника компанії будматеріалів у Бережанах. Відповідай українською. Готуй аналіз, кошториси, інструкції, плани та чернетки. Відділяй перевірені дані від оцінок. Уточнюй лише суттєве. Наприкінці вкажи готовий результат або потрібну дію власника. Ціни, бюджети, платежі й кадрові рішення затверджує власник. У цій версії ти відповідаєш у кабінеті та готуєш чернетки. Не стверджуй, що надіслав повідомлення, створив зовнішнє завдання чи прочитав CUST.";

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return json({ error: "method" }, 405);
  const ownerId = Deno.env.get("OWNER_AI_USER_ID");
  const key = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OWNER_AI_MODEL");
  if (!ownerId || !uuid.test(ownerId) || !key || !model) return json({ error: "setup" }, 503);
  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({ error: "login" }, 401);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) return json({ error: "login" }, 401);
  if (user.id !== ownerId) return json({ error: "owner" }, 403);

  const raw = await request.text();
  if (raw.length > 26000) return json({ error: "input" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "input" }, 400); }
  if (body?.action === "list") {
    // The OpenAI request times out before this threshold.
    const cutoff = new Date(Date.now() - 120000).toISOString();
    const expired = await db.from("owner_ai_requests").update({ status: "failed" })
      .eq("owner_id", ownerId).eq("status", "pending").lt("created_at", cutoff);
    if (expired.error) return json({ error: "storage" }, 503);
    const result = await db.from("owner_ai_requests").select(columns)
      .eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(30);
    return result.error ? json({ error: "storage" }, 503) : json({ items: result.data });
  }
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (body?.action !== "submit" || typeof body.id !== "string" || !uuid.test(body.id) ||
      !prompt || prompt.length > 4000) return json({ error: "input" }, 400);

  const existing = await db.from("owner_ai_requests").select(columns).eq("owner_id", ownerId)
    .eq("id", body.id).maybeSingle();
  if (existing.error) return json({ error: "storage" }, 503);
  if (existing.data) return json({ item: existing.data });
  const saved = await db.from("owner_ai_requests").insert({ id: body.id, owner_id: ownerId, prompt });
  if (saved.error?.code === "23505") return json({ pending: true }, 202);
  if (saved.error) return json({ error: "storage" }, 503);
  let answer = "";
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: AbortSignal.timeout(50000),
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, instructions: role, input: prompt, store: false, max_output_tokens: 3000 }),
    });
    if (!response.ok) throw Error();
    const result = await response.json();
    answer = result.output?.flatMap(item => item.type === "message" ? item.content ?? [] : [])
      .filter(item => item.type === "output_text" || item.type === "refusal")
      .map(item => item.text ?? item.refusal).join("\n").trim() ?? "";
  } catch { /* Persist failure so the owner can submit again intentionally. */ }
  const updated = await db.from("owner_ai_requests").update({ answer: answer || null, status: answer ? "done" : "failed" })
    .eq("owner_id", ownerId).eq("id", body.id).eq("status", "pending").select(columns).single();
  return updated.error ? json({ error: "storage" }, 503) : json({ item: updated.data });
});