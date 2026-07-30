import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const node = process.execPath
const api = spawn(node, [resolve('server/index.mjs')], { stdio: 'inherit', env: process.env })
const ui = spawn(node, [resolve('node_modules/vite/bin/vite.js')], { stdio: 'inherit', env: process.env })
const children = [api, ui]

let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
  setTimeout(() => process.exit(code), 250).unref()
}

for (const child of children) child.on('exit', (code) => { if (!stopping && code) stop(code) })
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
