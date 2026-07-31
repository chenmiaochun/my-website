import type { Customer, FollowUp } from '../types'

const API_BASE = 'http://127.0.0.1:3001/api'
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === 'true'
const STATIC_ACCOUNTS_KEY = 'shangpinju.static-accounts.v1'

export interface RemoteSalesState { customers: Customer[]; followUps: FollowUp[] }
export interface RemoteAuditEvent { id: number; action: string; resource: string; details: Record<string, unknown>; createdAt: string }
export type AccountRole = 'manager' | 'sales' | 'designer' | 'operations' | 'aftersales'
export interface RemoteAccount {
  id: string
  username: string
  name: string
  role: AccountRole
  phone?: string
  active: boolean
  mustChangePassword?: boolean
  lastLoginAt?: string | null
  createdAt?: string
}
export interface CreateAccountInput { username: string; name: string; role: AccountRole; password: string; phone?: string }
export interface UpdateAccountInput { username: string; name: string; role: AccountRole; phone?: string }

const defaultStaticAccounts: RemoteAccount[] = [
  { id: 'static-manager', username: 'manager', name: '访客店长', role: 'manager', active: true, mustChangePassword: false, phone: '', createdAt: new Date().toISOString() },
]
function loadStaticAccounts() {
  try { const value = localStorage.getItem(STATIC_ACCOUNTS_KEY); if (value) return JSON.parse(value) as RemoteAccount[] } catch { /* Use demo account. */ }
  return defaultStaticAccounts
}
function saveStaticAccounts(accounts: RemoteAccount[]) { localStorage.setItem(STATIC_ACCOUNTS_KEY, JSON.stringify(accounts)); return accounts }
function staticAccountError(message: string, status = 400): never { throw new ApiError(status, message) }

export class ApiError extends Error {
  constructor(public status: number, message = `API ${status}`) { super(message) }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...init, credentials: 'include' })
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('sales-crm:session-expired'))
    let message = `API ${response.status}`
    try { message = (await response.json() as { error?: string; message?: string }).message ?? message } catch { /* Use status fallback. */ }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const salesApi = {
  getCurrentUser: <T>() => request<{ user: T }>('/auth/me'),
  login: <T>(username: string, password: string) => request<{ user: T }>('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  health: () => request<{ ok: boolean }>('/health'),
  getState: () => request<{ value: Partial<RemoteSalesState>; updatedAt: string | null }>('/state'),
  putState: (state: RemoteSalesState) => request('/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) }),
  getAudit: () => request<{ items: RemoteAuditEvent[] }>('/audit?limit=50&offset=0'),
  getIntegrations: () => request<{ integrations: Record<string, Record<string, unknown>> }>('/integrations'),
  putIntegrations: (integrations: Record<string, Record<string, unknown>>) => request<{ integrations: Record<string, Record<string, unknown>> }>('/integrations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ integrations }) }),
  getMembers: <T>() => request<{ members: T[] }>('/members'),
  putMembers: <T>(members: T[]) => request<{ members: T[] }>('/members', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members }) }),
  getAccounts: () => STATIC_DEMO ? Promise.resolve({ accounts: loadStaticAccounts() }) : request<{ accounts: RemoteAccount[] }>('/accounts'),
  createAccount: (input: CreateAccountInput) => {
    if (!STATIC_DEMO) return request<{ account: RemoteAccount }>('/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
    const accounts = loadStaticAccounts(); if (accounts.some((item) => item.username.toLowerCase() === input.username.toLowerCase())) staticAccountError('API 409', 409)
    const { password: _password, ...profile } = input
    const account: RemoteAccount = { ...profile, id: `static-${Date.now()}`, active: true, mustChangePassword: true, createdAt: new Date().toISOString() }
    saveStaticAccounts([...accounts, account]); return Promise.resolve({ account })
  },
  updateAccount: (id: string, input: UpdateAccountInput) => {
    if (!STATIC_DEMO) return request<{ account: RemoteAccount }>(`/accounts/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
    const accounts = loadStaticAccounts(); const current = accounts.find((item) => item.id === id); if (!current) staticAccountError('API 400')
    const account = { ...current, ...input }; saveStaticAccounts(accounts.map((item) => item.id === id ? account : item)); return Promise.resolve({ account })
  },
  deleteAccount: (id: string) => STATIC_DEMO ? Promise.resolve(saveStaticAccounts(loadStaticAccounts().filter((item) => item.id !== id))).then(() => undefined) : request<void>(`/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setAccountActive: (id: string, active: boolean) => {
    if (!STATIC_DEMO) return request<{ account: RemoteAccount }>(`/accounts/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) })
    const accounts = loadStaticAccounts(); const current = accounts.find((item) => item.id === id); if (!current) staticAccountError('API 400')
    const account = { ...current, active }; saveStaticAccounts(accounts.map((item) => item.id === id ? account : item)); return Promise.resolve({ account })
  },
  resetAccountPassword: (id: string, password: string) => STATIC_DEMO ? Promise.resolve({ ok: Boolean(id && password) }) : request<{ ok: boolean }>(`/accounts/${encodeURIComponent(id)}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }),
}
