import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { listenerIdFor, main } from "../scripts/aiworker-listen.mjs";

test("listener identity persists per route with private file permissions", () => {
  const home = mkdtempSync(join(tmpdir(), "aiworker-listener-"));
  try {
    const first = listenerIdFor("orders", { home, randomUUID: () => "fixed-listener-id" });
    const second = listenerIdFor("orders", { home, randomUUID: () => "unexpected-id" });
    const file = join(home, ".config", "aiworker", "listener-orders.id");
    assert.equal(first, "fixed-listener-id");
    assert.equal(second, first);
    assert.equal(readFileSync(file, "utf8"), first);
    assert.equal(statSync(file).mode & 0o777, 0o600);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("listener falls back to a process-local identity when persistence is unavailable", () => {
  let next = 0;
  const id = () => `process-${++next}`;
  const fs = { mkdirSync() { throw new Error("read only"); }, readFileSync, writeFileSync() {} };
  assert.equal(listenerIdFor("orders", { home: tmpdir(), fs, randomUUID: id }), "process-1");
  assert.equal(listenerIdFor("orders", { home: tmpdir(), fs, randomUUID: id }), "process-2");
});

test("run mode sends its owner id and renews the lease while processing", async () => {
  const home = mkdtempSync(join(tmpdir(), "aiworker-listener-run-"));
  const requests = [], event = { id: 51, route: "orders", title: "Order", payload: { order: 51 }, prompt: "Handle order", agent: { target: "codex", session_mode: "new" } };
  const fetch = async (url, init = {}) => {
    const path = new URL(url).pathname, method = init.method || "GET", body = init.body ? JSON.parse(init.body) : {};
    requests.push({ path, method, url, body });
    let result = {};
    if (path.endsWith("/agent/routes")) result = { data: [{ name: "orders", target: "codex", session_mode: "new", status: "active" }] };
    else if (path.endsWith("/agent/events") && method === "GET") result = url.includes("backlog=1") ? { events: [event] } : { events: [] };
    else if (path.endsWith("/presented") || path.endsWith("/lease") || path.endsWith("/ack")) result = { ok: true };
    return { ok: true, status: 200, json: async () => result };
  };
  const spawn = () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.stdin = { end() {} }; child.kill = () => {};
    queueMicrotask(() => child.emit("close", 0));
    return child;
  };
  try {
    const code = await main(["--route", "orders", "--mode", "run", "--once"], {
      env: { AIWORKER_API_KEY: "test-key" }, fetch, spawn, stdout: { write(_line, done) { done(); } }, stderr: { write() {} },
      setInterval(callback) { callback(); return 1; }, clearInterval() {}, sleep: async () => {},
      listenerOptions: { home, randomUUID: () => "persisted-listener-id" },
    });
    assert.equal(code, 0);
    const eventRequests = requests.filter((request) => request.path.endsWith("/agent/events"));
    assert.ok(eventRequests.every((request) => request.url.includes("listener=persisted-listener-id")));
    for (const suffix of ["/presented", "/lease", "/ack"]) {
      const request = requests.find((item) => item.path.endsWith(suffix));
      assert.equal(request?.body.listener, "persisted-listener-id", suffix);
    }
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("live mode presents an event without renewing its lease", async () => {
  const home = mkdtempSync(join(tmpdir(), "aiworker-listener-live-"));
  const requests = [], event = { id: 52, route: "orders", title: "Order", payload: {}, agent: { target: "claude", session_mode: "live" } };
  const fetch = async (url, init = {}) => {
    const path = new URL(url).pathname, method = init.method || "GET";
    requests.push({ path, method, body: init.body ? JSON.parse(init.body) : {} });
    const result = path.endsWith("/agent/routes") ? { data: [{ name: "orders", target: "claude", session_mode: "live", status: "active" }] }
      : path.endsWith("/agent/events") ? { events: url.includes("backlog=1") ? [event] : [] } : { ok: true };
    return { ok: true, status: 200, json: async () => result };
  };
  try {
    await main(["--route", "orders", "--mode", "live", "--once"], {
      env: { AIWORKER_API_KEY: "test-key" }, fetch, stdout: { write(_line, done) { done(); } }, stderr: { write() {} },
      listenerOptions: { home, randomUUID: () => "live-listener-id" },
    });
    assert.ok(requests.some((request) => request.path.endsWith("/presented") && request.body.listener === "live-listener-id"));
    assert.ok(!requests.some((request) => request.path.endsWith("/lease")));
    assert.ok(!requests.some((request) => request.path.endsWith("/ack")));
  } finally { rmSync(home, { recursive: true, force: true }); }
});
