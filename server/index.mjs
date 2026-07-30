import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SalesDatabase } from './database.mjs'
import { createApiServer } from './app.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(process.env.SALES_DATA_DIR || join(here, 'data'))
mkdirSync(dataDir, { recursive: true })
const database = new SalesDatabase(join(dataDir, 'sales.sqlite'))
const server = createApiServer({ database, maxBodyBytes: Number(process.env.SALES_MAX_BODY_BYTES || 1_048_576), corsOrigin: process.env.SALES_CORS_ORIGIN || '*' })
const port = Number(process.env.PORT || 3001)
server.listen(port, () => console.log(`Sales data API listening on http://localhost:${port}`))

let shuttingDown = false
function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${signal} received, shutting down`)
  server.close(() => { database.close(); process.exit(0) })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
