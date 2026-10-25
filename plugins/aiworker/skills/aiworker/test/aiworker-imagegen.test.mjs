import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn as nodeSpawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, pair, readConfig, runOne } from '../scripts/aiworker-imagegen.mjs';

test('pair stores a scoped token in a 0600 config and status output never contains it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aiworker-imagegen-test-')), token = 'aiw_img_' + 'x'.repeat(56), env = { AIW_IMAGEGEN_CONFIG: join(dir, 'config.json') };
  try {
    const path = await pair(token, { env, base: 'https://example.test/app/api/v1/image-worker/' });
    const config = await readConfig(env), info = await (await import('node:fs/promises')).stat(path);
    assert.equal(config.token, token); assert.equal(config.base, 'https://example.test/app/api/v1/image-worker'); assert.equal(info.mode & 0o777, 0o600);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pair reads the token from hidden stdin instead of command arguments', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aiworker-imagegen-pair-')), token = 'aiw_img_' + 'p'.repeat(56);
  const env = { AIW_IMAGEGEN_CONFIG: join(dir, 'config.json') }, output = [], errors = [];
  try {
    const code = await main(['pair'], { env, stdin: Readable.from([`${token}\n`]), stdout: { write: (s) => output.push(String(s)) }, stderr: { write: (s) => errors.push(String(s)) } });
    assert.equal(code, 0); assert.equal((await readConfig(env)).token, token);
    assert.equal((output.join('') + errors.join('')).includes(token), false);
    assert.match(output.join(''), /Paste pairing token \(hidden\)/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runOne uses a mock Codex binary, uploads one image, and never writes the token to stdout', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aiworker-imagegen-run-')), bin = join(root, 'codex-mock.mjs');
  const token = 'aiw_img_' + 'z'.repeat(56), png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), Buffer.from('mock')]);
  await writeFile(bin, `#!/usr/bin/env node\nimport { writeFileSync } from 'node:fs'; writeFileSync('made.png', Buffer.from('${png.toString('base64')}','base64'));\n`); await chmod(bin, 0o700);
  const calls = [], config = { base: 'https://example.test/app/api/v1/image-worker', token };
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith('/heartbeat')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    if (url.endsWith('/jobs/claim?wait=20')) return new Response(JSON.stringify({ job: { id: 41, prompt: 'small blue kite', aspect: '1:1', size: '1024x1024', quality: 'standard' } }), { status: 200 });
    if (url.endsWith('/jobs/41/result')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    throw new Error(`unexpected request ${url}`);
  };
  try {
    const sourceEnv = { ...process.env, AIW_CODEX_BIN: bin, AIWORKER_API_KEY: 'worker-secret', OPENAI_API_KEY: 'provider-secret' };
    let childEnv, childArgs;
    const result = await runOne(config, { fetch: fakeFetch, env: sourceEnv, tempRoot: root,
      spawn: (command, args, options) => { childEnv = options.env; childArgs = args; return nodeSpawn(command, args, options); } });
    assert.equal(result.status, 'done'); assert.equal(result.job_id, 41); assert.equal(calls.length, 3);
    assert.equal(calls[2].init.body.get('image').type, 'image/png');
    assert.ok(calls.every((call) => call.init.headers.Authorization === `Bearer ${token}`));
    assert.equal(JSON.stringify(result).includes(token), false);
    assert.equal(childEnv.AIWORKER_API_KEY, undefined); assert.equal(childEnv.OPENAI_API_KEY, undefined);
    assert.equal(childEnv.AIW_IMAGEGEN_CONFIG, undefined); assert.equal(childEnv.HOME, sourceEnv.HOME);
    assert.ok(childArgs.includes('workspace-write'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('status and run CLI output never prints the configured bearer token', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aiworker-imagegen-output-')), token = 'aiw_img_' + 'o'.repeat(56);
  const env = { AIW_IMAGEGEN_CONFIG: join(dir, 'config.json') }, output = [], errors = [];
  const stdout = { write: (s) => output.push(String(s)) }, stderr = { write: (s) => errors.push(String(s)) };
  const fetch = async (url) => new Response(JSON.stringify(url.endsWith('/status')
    ? { connection_id: 7, status: 'enabled', last_seen_at: '2026-10-24T12:00:00Z' }
    : url.endsWith('/jobs/claim?wait=20') ? { job: null } : { ok: true }), { status: 200 });
  try {
    await pair(token, { env });
    assert.equal(await main(['status'], { env, fetch, stdout, stderr }), 0);
    const statusText = output.join('') + errors.join('');
    assert.match(statusText, /Connection 7: enabled/); assert.equal(statusText.includes(token), false);
    output.length = 0; errors.length = 0;
    let polls = 0;
    assert.equal(await main(['run'], { env, fetch, stdout, stderr, sleep: async () => {}, stop: () => ++polls > 1 }), 0);
    assert.equal((output.join('') + errors.join('')).includes(token), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
