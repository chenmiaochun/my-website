import type { Customer, FollowUp } from '../types'

const API_BASE = 'http://127.0.0.1:3001/api'

export interface RemoteSalesState { customers: Customer[]; followUps: FollowUp[] }
export interface RemoteAuditEvent { id: number; action: string; resource: string; details: Record<string, unknown>; createdAt: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init)
  if (!response.ok) throw new Error(`API ${response.status}`)
  return response.json() as Promise<T>
}

export const salesApi = {
  health: () => request<{ ok: boolean }>('/health'),
  getState: () => request<{ value: Partial<RemoteSalesState>; updatedAt: string | null }>('/state'),
  putState: (state: RemoteSalesState) => request('/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) }),
  getAudit: () => request<{ items: RemoteAuditEvent[] }>('/audit?limit=50&offset=0'),
  getIntegrations: () => request<{ integrations: Record<string, Record<string, unknown>> }>('/integrations'),
  putIntegrations: (integrations: Record<string, Record<string, unknown>>) => request<{ integrations: Record<string, Record<string, unknown>> }>('/integrations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ integrations }) }),
  getMembers: <T>() => request<{ members: T[] }>('/members'),
  putMembers: <T>(members: T[]) => request<{ members: T[] }>('/members', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members }) }),
}
