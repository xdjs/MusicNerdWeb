import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';

// Real pg-pool + official lifecycle helper; only the wire client is offline.
class OfflineClient extends EventEmitter {
  _queryable = true;
  _ending = false;
  closed = false;
  connect(callback) { queueMicrotask(() => callback(null)); }
  end(callback) { this.closed = true; this.emit('end'); callback?.(); }
}

test('request remains alive until idle client closes; checked-out client survives and pool is reusable', async () => {
  const key = Symbol.for('@vercel/request-context');
  const previous = globalThis[key];
  const oldUrl = process.env.VERCEL_URL;
  const oldRegion = process.env.VERCEL_REGION;
  const waits = [];
  process.env.VERCEL_URL = 'offline.invalid';
  process.env.VERCEL_REGION = 'test';
  globalThis[key] = { get: () => ({ waitUntil: promise => waits.push(promise) }) };
  const pool = new Pool({ Client: OfflineClient, max: 3, idleTimeoutMillis: 40 });
  try {
    attachDatabasePool(pool);
    const active = await pool.connect();
    const idle = await pool.connect();
    idle.release();
    assert.equal(waits.length, 1);
    await waits[0];
    assert.equal(idle.closed, true);
    assert.equal(active.closed, false);
    assert.equal(pool.totalCount, 1);
    const replacement = await pool.connect();
    assert.notEqual(replacement, idle);
    assert.equal(replacement.closed, false);
    active.release();
    replacement.release();
    await Promise.all(waits);
    assert.equal(pool.totalCount, 0);
  } finally {
    await pool.end();
    if (previous === undefined) delete globalThis[key]; else globalThis[key] = previous;
    if (oldUrl === undefined) delete process.env.VERCEL_URL; else process.env.VERCEL_URL = oldUrl;
    if (oldRegion === undefined) delete process.env.VERCEL_REGION; else process.env.VERCEL_REGION = oldRegion;
  }
});
