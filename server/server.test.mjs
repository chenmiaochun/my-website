import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { SalesDatabase } from './database.mjs'
import { createApiServer } from './app.mjs'

let database, server, base
before(async () => {
  database = new SalesDatabase(':memory:')
  server = createApiServer({ database, maxBodyBytes: 256 })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => { await new Promise(resolve => server.close(resolve)); database.close() })

const json = (path, options) => fetch(base + path, options).then(async r => ({ status: r.status, body: r.status === 204 ? null : await r.json(), headers: r.headers }))
const put = (path, body) => json(path, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

test('health and CORS', async () => { const r = await json('/api/health'); assert.equal(r.status, 200); assert.equal(r.body.ok, true); assert.equal(r.headers.get('access-control-allow-origin'), '*') })
test('state round trip and audit', async () => {
  assert.deepEqual((await put('/api/state', { pipeline: ['new'] })).body.value, { pipeline: ['new'] })
  assert.deepEqual((await json('/api/state')).body.value, { pipeline: ['new'] })
  const audit = await json('/api/audit?limit=10&offset=0'); assert.equal(audit.body.total, 1); assert.equal(audit.body.items[0].resource, 'state')
})
test('members and integrations round trip', async () => {
  assert.deepEqual((await put('/api/members', { members: [{ id: 'u1', name: 'Li' }] })).body.members, [{ id: 'u1', name: 'Li' }])
  assert.deepEqual((await put('/api/integrations', { integrations: { crm: { enabled: true } } })).body.integrations, { crm: { enabled: true } })
})
test('backup can restore prior data', async () => {
  const backup = (await json('/api/backup')).body
  await put('/api/state', { changed: true })
  const restored = await json('/api/restore', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(backup) })
  assert.equal(restored.status, 200); assert.deepEqual((await json('/api/state')).body.value, { pipeline: ['new'] })
})
test('returns structured validation and size errors', async () => {
  const duplicate = await put('/api/members', [{ id: 'x' }, { id: 'x' }]); assert.equal(duplicate.status, 400); assert.equal(duplicate.body.error.code, 'VALIDATION_ERROR')
  const large = await put('/api/state', { text: 'x'.repeat(300) }); assert.equal(large.status, 413); assert.equal(large.body.error.code, 'PAYLOAD_TOO_LARGE')
  assert.equal((await json('/missing')).body.error.code, 'NOT_FOUND')
})
