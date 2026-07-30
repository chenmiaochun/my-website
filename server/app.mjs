import { createServer } from 'node:http'

const JSON_TYPE = { 'content-type': 'application/json; charset=utf-8' }
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details }
}

function validateMembers(value) {
  const items = Array.isArray(value) ? value : value?.members
  if (!Array.isArray(items)) throw new ApiError(400, 'VALIDATION_ERROR', 'members must be an array')
  const ids = new Set()
  for (const [index, item] of items.entries()) {
    if (!isObject(item) || typeof item.id !== 'string' || !item.id.trim()) throw new ApiError(400, 'VALIDATION_ERROR', `members[${index}].id must be a non-empty string`)
    if (ids.has(item.id)) throw new ApiError(400, 'VALIDATION_ERROR', `duplicate member id: ${item.id}`)
    ids.add(item.id)
  }
  return items
}

function validateIntegrations(value) {
  const settings = isObject(value?.integrations) ? value.integrations : value
  if (!isObject(settings)) throw new ApiError(400, 'VALIDATION_ERROR', 'integrations must be an object')
  for (const name of Object.keys(settings)) if (!name.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'integration names must be non-empty')
  return settings
}

function validateBackup(value) {
  if (!isObject(value) || value.version !== 1 || !isObject(value.state) || !isObject(value.integrations)) throw new ApiError(400, 'VALIDATION_ERROR', 'invalid version 1 backup')
  return { version: 1, state: value.state, members: validateMembers(value.members), integrations: validateIntegrations(value.integrations) }
}

async function readJson(req, maxBodyBytes) {
  const contentType = req.headers['content-type'] || ''
  if (!contentType.toLowerCase().startsWith('application/json')) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json')
  let size = 0; const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBodyBytes) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', `request body exceeds ${maxBodyBytes} bytes`)
    chunks.push(chunk)
  }
  if (!size) throw new ApiError(400, 'INVALID_JSON', 'request body is required')
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new ApiError(400, 'INVALID_JSON', 'request body is not valid JSON') }
}

export function createApiServer({ database, maxBodyBytes = 1_048_576, corsOrigin = '*' }) {
  return createServer(async (req, res) => {
    const headers = { ...JSON_TYPE, 'access-control-allow-origin': corsOrigin, 'access-control-allow-methods': 'GET, PUT, POST, OPTIONS', 'access-control-allow-headers': 'Content-Type' }
    const send = (status, body, extra = {}) => { res.writeHead(status, { ...headers, ...extra }); res.end(body === undefined ? undefined : JSON.stringify(body)) }
    if (req.method === 'OPTIONS') return send(204)
    try {
      const url = new URL(req.url, 'http://localhost')
      if (req.method === 'GET' && url.pathname === '/api/health') return send(200, { ok: true, service: 'sales-data', timestamp: new Date().toISOString() })
      if (req.method === 'GET' && url.pathname === '/api/state') return send(200, database.getState())
      if (req.method === 'PUT' && url.pathname === '/api/state') { const body = await readJson(req, maxBodyBytes); if (!isObject(body)) throw new ApiError(400, 'VALIDATION_ERROR', 'state must be an object'); return send(200, database.setState(body)) }
      if (req.method === 'GET' && url.pathname === '/api/audit') {
        const limit = Number(url.searchParams.get('limit') ?? 50), offset = Number(url.searchParams.get('offset') ?? 0)
        if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) throw new ApiError(400, 'VALIDATION_ERROR', 'limit must be 1..200 and offset must be non-negative')
        return send(200, database.getAudit(limit, offset))
      }
      if (req.method === 'GET' && url.pathname === '/api/backup') return send(200, database.backup(), { 'content-disposition': 'attachment; filename="sales-backup.json"' })
      if (req.method === 'POST' && url.pathname === '/api/restore') return send(200, database.restore(validateBackup(await readJson(req, maxBodyBytes))))
      if (req.method === 'GET' && url.pathname === '/api/members') return send(200, { members: database.getMembers() })
      if (req.method === 'PUT' && url.pathname === '/api/members') return send(200, { members: database.setMembers(validateMembers(await readJson(req, maxBodyBytes))) })
      if (req.method === 'GET' && url.pathname === '/api/integrations') return send(200, { integrations: database.getIntegrations() })
      if (req.method === 'PUT' && url.pathname === '/api/integrations') return send(200, { integrations: database.setIntegrations(validateIntegrations(await readJson(req, maxBodyBytes))) })
      throw new ApiError(404, 'NOT_FOUND', 'API route not found')
    } catch (error) {
      const known = error instanceof ApiError
      if (!known) console.error(error)
      send(known ? error.status : 500, { error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : 'Internal server error', ...(known && error.details ? { details: error.details } : {}) } })
    }
  })
}
