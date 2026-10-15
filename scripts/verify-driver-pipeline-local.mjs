import net from 'node:net';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { basename } from 'node:path';
const require = createRequire(import.meta.url);
const postgres = require('postgres');
const { Pool } = require('pg');
const port = Number(process.env.MUSICNERD_TEST_PG_PORT);
assert(Number.isInteger(port) && port > 1024 && port < 65536, 'Set MUSICNERD_TEST_PG_PORT to the disposable loopback PostgreSQL port');

// Disposable loopback database only. No environment connection string is accepted.
const sockets = new Set();
const stats = { maxInFlight: 0, queries: 0, connections: 0 };
const proxy = net.createServer(client => {
  const backend = net.connect({ host: '127.0.0.1', port });
  sockets.add(client); sockets.add(backend); stats.connections++;
  let startup = true, request = Buffer.alloc(0), response = Buffer.alloc(0), inFlight = 0;
  client.on('data', chunk => {
    request = Buffer.concat([request, chunk]);
    if (startup && request.length >= 4) {
      const len = request.readInt32BE(0);
      if (request.length < len) return;
      backend.write(request.subarray(0, len)); request = request.subarray(len); startup = false;
    }
    if (startup) return;
    while (request.length >= 5) {
      const len = 1 + request.readInt32BE(1);
      if (request.length < len) break;
      const msg = request.subarray(0, len); request = request.subarray(len);
      if (msg[0] === 66 || msg[0] === 81) { // Bind or simple Query; ReadyForQuery closes it.
        inFlight++; stats.queries++; stats.maxInFlight = Math.max(stats.maxInFlight, inFlight);
      }
      backend.write(msg);
    }
  });
  backend.on('data', chunk => {
    response = Buffer.concat([response, chunk]);
    while (response.length >= 5) {
      const len = 1 + response.readInt32BE(1);
      if (response.length < len) break;
      const msg = response.subarray(0, len); response = response.subarray(len);
      if (msg[0] === 90) inFlight = Math.max(0, inFlight - 1);
      client.write(msg);
    }
  });
  client.on('error', () => backend.destroy()); backend.on('error', () => client.destroy());
  client.on('close', () => { sockets.delete(client); backend.destroy(); });
  backend.on('close', () => { sockets.delete(backend); client.destroy(); });
});
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
const url = `postgres://${process.env.USER}@127.0.0.1:${proxy.address().port}/postgres`;
const reset = () => Object.assign(stats, { maxInFlight: 0, queries: 0, connections: 0 });
const results = {};
try {
  const old = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });
  try {
    const [cluster] = await old`select current_setting('data_directory') as path`;
    assert.equal(basename(cluster.path), 'local-pg-incident');
    await Promise.all([0, 1, 2].map(i => old`select ${i}::int`)); reset();
    const rows = await Promise.all(Array.from({ length: 18 }, (_, i) => old`select ${i}::int as marker, pg_sleep(0.03)`));
    assert.deepEqual(rows.map(r => r[0].marker), Array.from({ length: 18 }, (_, i) => i));
    results.postgresJsParameterized = { ...stats, correctRows: true };
    reset();
    const simple = await Promise.all(Array.from({ length: 18 }, (_, i) => old.unsafe(`select ${i}::int as marker, pg_sleep(0.03)`).values()));
    assert.deepEqual(simple.map(r => r[0][0]), Array.from({ length: 18 }, (_, i) => i));
    results.postgresJsUnparameterized = { ...stats, correctRows: true };
    reset();
    const mixed = await Promise.all(Array.from({ length: 18 }, (_, i) => i % 3 === 0
      ? old.unsafe(`select ${i}::int as marker, pg_sleep(0.03)`).values()
      : old.unsafe('select $1::int as marker, pg_sleep(0.03)', [i]).values()));
    assert.deepEqual(mixed.map(r => r[0][0]), Array.from({ length: 18 }, (_, i) => i));
    results.postgresJsMixed = { ...stats, correctRows: true };
    assert(stats.maxInFlight > 1, 'The current postgres.js mixed batch should reproduce overlapping queries');
  } finally { await old.end({ timeout: 1 }); }

  const pg = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 20000, connectionTimeoutMillis: 10000, pipeline: false });
  try {
    await Promise.all([0, 1, 2].map(i => pg.query('select $1::int', [i]))); reset();
    const rows = await Promise.all(Array.from({ length: 18 }, (_, i) => i % 3 === 0
      ? pg.query(`select ${i}::int as marker, pg_sleep(0.03)`)
      : pg.query('select $1::int as marker, pg_sleep(0.03)', [i])));
    assert.deepEqual(rows.map(r => r.rows[0].marker), Array.from({ length: 18 }, (_, i) => i));
    results.nodePostgres = { ...stats, correctRows: true };
    assert.equal(stats.maxInFlight, 1, 'Node-postgres must await ReadyForQuery before another query');
  } finally { await pg.end(); }

  console.log(JSON.stringify(results, null, 2));
  const zero = postgres(url, { prepare: false, max: 1, max_pipeline: 0 });
  const unhandled = () => {};
  process.on('unhandledRejection', unhandled);
  try {
    await zero`select 1`;
    await assert.rejects(zero.begin(async tx => tx`select 1`));
    results.maxPipelineZero = { transactionRejected: true };
  } finally { await zero.end({ timeout: 1 }); process.off('unhandledRejection', unhandled); }
  console.log(JSON.stringify({ maxPipelineZero: results.maxPipelineZero }, null, 2));
} finally {
  for (const socket of sockets) socket.destroy();
  await new Promise(resolve => proxy.close(resolve));
}
