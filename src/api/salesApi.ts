import type { Customer, FollowUp } from '../types'

const API_BASE = 'http://127.0.0.1:3001/api'

export interface RemoteSalesState { customers: Customer[]; followUps: FollowUp[] }
export interface RemoteAuditEvent { id: number; action: string; resource: string; details: Record<string, unknown>; createdAt: string }
export type AccountRole = 'manager' | 'sales' | 'designer' | 'operations' | 'aftersales'
export interface RemoteAccount {
  id: string
  username: string
  name: string
  role: AccountRole
  active: boolean
  mustChangePassword?: boolean
  lastLoginAt?: string | null
  createdAt?: string
}
export interface CreateAccountInput { username: string; name: string; role: AccountRole; password: string }

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
  getAccounts: () => request<{ accounts: RemoteAccount[] }>('/accounts'),
  createAccount: (input: CreateAccountInput) => request<{ account: RemoteAccount }>('/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
  setAccountActive: (id: string, active: boolean) => request<{ account: RemoteAccount }>(`/accounts/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) }),
  resetAccountPassword: (id: string, password: string) => request<{ ok: boolean }>(`/accounts/${encodeURIComponent(id)}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }),
}
