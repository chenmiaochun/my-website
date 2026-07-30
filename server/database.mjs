import { DatabaseSync } from 'node:sqlite'

const parseJson = (value) => JSON.parse(value)

export class SalesDatabase {
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename)
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        value TEXT NOT NULL CHECK (json_valid(value)),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        details TEXT NOT NULL CHECK (json_valid(details)),
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL CHECK (json_valid(value)),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS integration_settings (
        name TEXT PRIMARY KEY,
        value TEXT NOT NULL CHECK (json_valid(value)),
        updated_at TEXT NOT NULL
      );
    `)
    this.statements = {
      getState: this.db.prepare('SELECT value, updated_at FROM app_state WHERE id = 1'),
      putState: this.db.prepare(`INSERT INTO app_state(id, value, updated_at) VALUES(1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`),
      audit: this.db.prepare('INSERT INTO audit_log(action, resource, details, created_at) VALUES(?, ?, ?, ?)'),
      getAudit: this.db.prepare('SELECT id, action, resource, details, created_at FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?'),
      countAudit: this.db.prepare('SELECT COUNT(*) AS count FROM audit_log'),
      listMembers: this.db.prepare('SELECT id, value, updated_at FROM members ORDER BY id'),
      putMember: this.db.prepare(`INSERT INTO members(id, value, updated_at) VALUES(?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`),
      deleteMembers: this.db.prepare('DELETE FROM members'),
      listIntegrations: this.db.prepare('SELECT name, value, updated_at FROM integration_settings ORDER BY name'),
      putIntegration: this.db.prepare(`INSERT INTO integration_settings(name, value, updated_at) VALUES(?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`),
      deleteIntegrations: this.db.prepare('DELETE FROM integration_settings'),
    }
  }

  now() { return new Date().toISOString() }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE')
    try { const result = fn(); this.db.exec('COMMIT'); return result }
    catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  record(action, resource, details = {}) {
    this.statements.audit.run(action, resource, JSON.stringify(details), this.now())
  }
  getState() {
    const row = this.statements.getState.get()
    return row ? { value: parseJson(row.value), updatedAt: row.updated_at } : { value: {}, updatedAt: null }
  }
  setState(value) {
    const at = this.now()
    this.transaction(() => { this.statements.putState.run(JSON.stringify(value), at); this.record('update', 'state') })
    return { value, updatedAt: at }
  }
  getAudit(limit, offset) {
    return { items: this.statements.getAudit.all(limit, offset).map(r => ({ ...r, details: parseJson(r.details), createdAt: r.created_at, created_at: undefined })), total: Number(this.statements.countAudit.get().count), limit, offset }
  }
  getMembers() { return this.statements.listMembers.all().map(r => ({ ...parseJson(r.value), id: r.id })) }
  setMembers(items) {
    const at = this.now()
    this.transaction(() => { this.statements.deleteMembers.run(); for (const item of items) this.statements.putMember.run(item.id, JSON.stringify(item), at); this.record('replace', 'members', { count: items.length }) })
    return this.getMembers()
  }
  getIntegrations() { return Object.fromEntries(this.statements.listIntegrations.all().map(r => [r.name, parseJson(r.value)])) }
  setIntegrations(settings) {
    const at = this.now()
    this.transaction(() => { this.statements.deleteIntegrations.run(); for (const [name, value] of Object.entries(settings)) this.statements.putIntegration.run(name, JSON.stringify(value), at); this.record('replace', 'integrations', { names: Object.keys(settings) }) })
    return this.getIntegrations()
  }
  backup() { return { version: 1, createdAt: this.now(), state: this.getState().value, members: this.getMembers(), integrations: this.getIntegrations() } }
  restore(data) {
    const at = this.now()
    this.transaction(() => {
      this.statements.putState.run(JSON.stringify(data.state), at)
      this.statements.deleteMembers.run()
      for (const item of data.members) this.statements.putMember.run(item.id, JSON.stringify(item), at)
      this.statements.deleteIntegrations.run()
      for (const [name, value] of Object.entries(data.integrations)) this.statements.putIntegration.run(name, JSON.stringify(value), at)
      this.record('restore', 'backup', { version: data.version })
    })
    return this.backup()
  }
  close() { this.db.close() }
}
