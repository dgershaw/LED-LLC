// The portal's one-click "Approve and publish to live" (David, 2026-11-17). A Cloudflare Pages Function of the sandbox
// project, at /admin/approve. It checks the approver's personal code and starts .github/workflows/approve.yml in that
// person's name, exactly as the Pages CMS action does. Nothing secret lives in the repository; two secrets are set in
// Cloudflare (led-sandbox > Settings > Variables and Secrets):
//   APPROVERS      who may approve, as "Name=code; Name=code" (each person has their own code, 12 characters or more)
//   GITHUB_TOKEN   a fine-grained GitHub token for this repository with Actions: read and write
// Until both are set it answers 501 and the portal falls back to the Pages CMS Actions page.
const REPO = "dgershaw/LED-LLC";

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function same(a, b) {   // compares every character, so the time taken tells nothing about the code
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function approver(list, code) {
  let found = "";
  for (const pair of String(list).split(/[;\n]/)) {
    const at = pair.indexOf("=");
    if (at < 1) continue;
    const name = pair.slice(0, at).trim().replace(/^["']/, ""), theirs = pair.slice(at + 1).trim().replace(/["']$/, "");
    if (theirs.length >= 12 && same(theirs, code)) found = name;
  }
  return found;
}

export async function onRequestPost({ request, env }) {
  if (!env.APPROVERS || !env.GITHUB_TOKEN) return json(501, { error: "not-set-up" });
  if (new URL(request.url).origin !== request.headers.get("origin")) return json(403, { error: "wrong-page" });
  let body;
  try { body = await request.json(); } catch (e) { return json(400, { error: "bad-request" }); }
  // people sometimes type the whole "Name=code" entry, or wrap it in quotes; only the code counts
  const typed = String(body.code || "").trim().replace(/^["']|["']$/g, "");
  const name = approver(env.APPROVERS, typed) || approver(env.APPROVERS, typed.slice(typed.indexOf("=") + 1).trim());
  if (!name) {
    await new Promise(done => setTimeout(done, 1500));   // slows down guessing
    return json(401, { error: "wrong-code" });
  }
  const note = String(body.note || "").slice(0, 300);
  const payload = JSON.stringify({ triggeredBy: { name }, inputs: { note } });
  const gh = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/approve.yml/dispatches`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json",
               "x-github-api-version": "2022-11-28", "user-agent": "led-site-portal", "content-type": "application/json" },
    body: JSON.stringify({ ref: "main", inputs: { payload } }) });
  if (gh.status !== 204) return json(502, { error: "github", status: gh.status });
  return json(200, { ok: true, name });
}

export const onRequest = () => json(405, { error: "post-only" });
