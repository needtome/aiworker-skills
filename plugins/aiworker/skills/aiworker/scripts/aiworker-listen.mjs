#!/usr/bin/env node
/*
 * AI Worker listener (ADR 102): events of an AI Worker route reach your own Claude Code or Codex at once.
 *
 *   node aiworker-listen.mjs --route orders --mode live   one line per event on stdout (run it with Claude Code's Monitor
 *                                                          tool: each line wakes the session that started it)
 *   node aiworker-listen.mjs --route orders --mode run    runs the route's agent headless for each event and reports back
 *
 * The key comes from AIWORKER_API_KEY or --key-file (never from the command line, never printed). Node 18+, no dependencies.
 * It waits on the route's wake-up signal (a long-poll on the AI Worker OMS: only «there is an event», no content) and fetches
 * the events themselves with the key; without the signal it asks every 5 seconds.
 */
import { readFileSync } from "node:fs";
import { spawn as nodeSpawn } from "node:child_process";
import { pathToFileURL } from "node:url";

export const DEFAULT_BASE = "https://kra.name/app/api/v1";
const POLL_MS = 5000, WAKE_TIMEOUT_MS = 60000, LINE_DATA = 2000, RESULT_MAX = 4000;

export function parseArgs(argv) {
  const o = { mode: "live", agentArgs: [], once: false, timeoutMin: 30 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === "--route") o.route = next();
    else if (a === "--mode") o.mode = next();
    else if (a === "--key-file") o.keyFile = next();
    else if (a === "--base") o.base = next();
    else if (a === "--cwd") o.cwd = next();
    else if (a === "--agent-arg") o.agentArgs.push(next());
    else if (a === "--timeout-min") o.timeoutMin = Number(next()) || 30;
    else if (a === "--once") o.once = true;
    else if (a === "--help" || a === "-h") o.help = true;
    else throw new Error(`unknown option ${a}`);
  }
  if (!o.help && !o.route) throw new Error("--route <name> is required");
  if (!["live", "run"].includes(o.mode)) throw new Error("--mode is live or run");
  return o;
}

/** The headless command for one event: the prompt goes on stdin, never on the command line. */
export function buildCommand(agent, extra = [], env = process.env) {
  const target = agent?.target === "codex" ? "codex" : "claude", sid = agent?.session_id || "";
  const resume = agent?.session_mode === "resume" || (agent?.session_mode === "live" && sid);
  if (agent?.session_mode === "resume" && !sid) throw new Error("the route resumes a session but has no session id");
  if (target === "claude") return { cmd: env.AIWORKER_CLAUDE_BIN || "claude", args: ["-p", ...(resume ? ["--resume", sid] : []), ...extra] };
  return { cmd: env.AIWORKER_CODEX_BIN || "codex", args: ["exec", ...(resume ? ["resume"] : []), "--skip-git-repo-check", ...extra, ...(resume ? [sid] : []), "-"] };
}

/** One line for the live mode: what happened, the data (cut), the owner's instruction, how to report back. */
export function eventLine(e) {
  const flat = (s, n) => { s = `${s ?? ""}`.replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };
  const data = flat(JSON.stringify(e.payload ?? {}), LINE_DATA), instr = flat(e.agent?.instruction || "", 500);
  return `AI Worker event #${e.id} for route ${e.route}: ${flat(e.title, 300)} — ${data}${instr ? `; instruction: ${instr}` : ""}; when done call MCP agent_ack ${JSON.stringify({ event_id: e.id, status: "done", result: "…" })} (full event: MCP agent_events event_id ${e.id})`;
}

function tail(text, n = RESULT_MAX) { const t = `${text || ""}`.trim(); return t.length > n ? "…" + t.slice(-n) : t; }

export async function main(argv, deps = {}) {
  const env = deps.env || process.env, out = deps.stdout || process.stdout, err = deps.stderr || process.stderr;
  const fetchFn = deps.fetch || globalThis.fetch, spawnFn = deps.spawn || nodeSpawn, sleep = deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const say = (m) => err.write(`[aiworker-listen] ${m}\n`);
  let o;
  try { o = parseArgs(argv); } catch (e) { say(e.message); return 2; }
  if (o.help) { out.write("usage: node aiworker-listen.mjs --route <name> [--mode live|run] [--key-file <file>] [--base <api url>] [--cwd <dir>] [--agent-arg <arg>]... [--timeout-min 30] [--once]\n"); return 0; }
  let key = (env.AIWORKER_API_KEY || "").trim();
  if (!key && o.keyFile) { try { key = readFileSync(o.keyFile, "utf8").trim(); } catch { say("cannot read the key file"); return 2; } }
  if (!key) { say("set AIWORKER_API_KEY (or pass --key-file): the API key from the panel, Settings → Integrations"); return 2; }
  const base = (o.base || env.AIWORKER_API_URL || DEFAULT_BASE).replace(/\/+$/, "");

  const api = async (path, init = {}) => {
    const r = await fetchFn(base + path, { ...init, headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...(init.headers || {}) } });
    let body = null; try { body = await r.json(); } catch { body = null; }
    if (r.status === 401 || r.status === 403) { const e = new Error(r.status === 401 ? "the API key is not accepted" : `the account has no API (${body?.error || "plan"})`); e.fatal = true; throw e; }
    if (!r.ok) throw new Error(`HTTP ${r.status}${body?.error ? `: ${body.error}` : ""}`);
    return body;
  };
  const ack = (id, status, result) => api(`/agent/events/${id}/ack`, { method: "POST", body: JSON.stringify({ status, result: tail(result) }) });

  let route;
  try {
    route = ((await api("/agent/routes")).data || []).find((r) => r.name === o.route || `${r.id}` === o.route);
    if (!route) { say(`route «${o.route}» is not in this account (panel → AI agents)`); return 2; }
  } catch (e) { say(e.message); return 2; }
  say(`route ${route.name} (${route.target}, ${route.session_mode}${route.status === "paused" ? ", paused" : ""}), mode ${o.mode}; waiting for events${route.wake ? "" : " (asking every 5 s)"}`);

  const runAgent = (e) => new Promise((resolve) => {
    let cmd;
    try { cmd = buildCommand(e.agent || route, o.agentArgs, env); } catch (x) { resolve({ code: 1, text: x.message }); return; }
    let text = "", done = false;
    const child = spawnFn(cmd.cmd, cmd.args, { cwd: o.cwd || process.cwd(), env, stdio: ["pipe", "pipe", "pipe"], shell: process.platform === "win32" });
    const keep = (b) => { text = (text + b).slice(-RESULT_MAX * 4); };
    child.stdout?.on("data", keep); child.stderr?.on("data", keep);
    const timer = setTimeout(() => { keep(`\n(stopped after ${o.timeoutMin} min)`); try { child.kill(); } catch {} }, o.timeoutMin * 60000);
    const finish = (code) => { if (done) return; done = true; clearTimeout(timer); resolve({ code, text }); };
    child.on("error", (x) => { keep(`\n${x.message}`); finish(127); });
    child.on("close", (code) => finish(code ?? 1));
    child.stdin?.end(e.prompt || eventLine(e));
  });

  const handle = async (e) => {
    if (o.mode === "live") { out.write(eventLine(e) + "\n"); return; }
    say(`event #${e.id}: running ${(e.agent || route).target}`);
    const r = await runAgent(e);
    await ack(e.id, r.code === 0 ? "done" : "failed", r.code === 0 ? r.text : `exit ${r.code}: ${r.text}`).catch((x) => say(`ack #${e.id}: ${x.message}`));
    say(`event #${e.id}: ${r.code === 0 ? "done" : "failed (exit " + r.code + ")"}`);
  };

  let after = 0;
  const drain = async () => {
    for (let guard = 0; guard < 50; guard++) {
      const res = await api(`/agent/events?route=${encodeURIComponent(route.name)}&after=${after}`);
      const list = res.events || [];
      for (const e of list) { after = Math.max(after, e.id); await handle(e); }
      if (list.length < 20) return;
    }
  };

  /* the wake-up: one long-poll on the OMS with the route's own key; it answers with a short JSON on an event, «n»/«-1» otherwise */
  const wake = async () => {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), WAKE_TIMEOUT_MS);
    try { const r = await fetchFn(`${route.wake.url}&_=${Date.now()}`, { signal: ctrl.signal, cache: "no-store" }); if (!r.ok) throw new Error(`wake HTTP ${r.status}`); const txt = await r.text(); if (txt === "-1") throw new Error("wake key refused"); return true; }
    catch (x) { if (x?.name === "AbortError") return true; throw x; }
    finally { clearTimeout(t); }
  };

  let wakeErrors = 0, pollUntil = 0, netErrors = 0;
  for (;;) {
    if (deps.stop?.()) return 0;
    const useWake = !o.once && route.wake?.url && Date.now() >= pollUntil;
    const pending = useWake ? wake() : null;   // subscribed before the fetch: an event published meanwhile is not missed
    pending?.catch(() => {});
    try { await drain(); netErrors = 0; }
    catch (x) {
      if (x.fatal) { say(x.message); return 3; }
      netErrors++; say(`fetch: ${x.message}`);
      if (o.once) return 1;
      await sleep(Math.min(60000, POLL_MS * netErrors));
    }
    if (o.once) return 0;
    if (pending) {
      const started = Date.now();
      try { await pending; wakeErrors = 0; if (Date.now() - started < 1000) await sleep(1000); }   /* never a tight loop on a quick «n» */
      catch (x) { wakeErrors++; if (wakeErrors >= 3) { say(`wake-up signal unavailable (${x.message}), asking every 5 s for 2 min`); pollUntil = Date.now() + 120000; wakeErrors = 0; } else await sleep(1000 * wakeErrors); }
    } else await sleep(POLL_MS);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).then((code) => process.exit(code ?? 0));
