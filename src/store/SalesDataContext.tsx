import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { salesApi, type RemoteAuditEvent } from '../api/salesApi'
import { customers as seedCustomers, followUps as seedFollowUps } from '../data'
import type { Customer, FollowUp } from '../types'

const STORAGE_KEY = 'shangpinju.customer-followup.v1'

interface SalesState { customers: Customer[]; followUps: FollowUp[] }
interface SalesDataValue extends SalesState {
  addCustomers: (items: Customer[]) => void
  addFollowUp: (item: FollowUp) => void
  replaceState: (state: SalesState) => void
  updateCustomer: (id: string, changes: Partial<Customer>) => void
  serverStatus: 'connecting' | 'connected' | 'offline'
  auditEvents: RemoteAuditEvent[]
  integrationSettings: Record<string, Record<string, unknown>>
  refreshAdminData: () => Promise<void>
  saveIntegrations: (settings: Record<string, Record<string, unknown>>) => Promise<void>
}

const SalesDataContext = createContext<SalesDataValue | null>(null)

function loadState(): SalesState {
  if (typeof window === 'undefined') return { customers: seedCustomers, followUps: seedFollowUps }
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (value) {
      const state = JSON.parse(value) as SalesState
      if (Array.isArray(state.customers) && Array.isArray(state.followUps)) return state
    }
  } catch { /* Fall back to bundled sample data. */ }
  return { customers: seedCustomers, followUps: seedFollowUps }
}

export function SalesDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SalesState>(loadState)
  const [serverStatus, setServerStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting')
  const [auditEvents, setAuditEvents] = useState<RemoteAuditEvent[]>([])
  const [integrationSettings, setIntegrationSettings] = useState<Record<string, Record<string, unknown>>>({})
  const hydrated = useRef(false)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const refreshAdminData = useCallback(async () => {
    const [audit, integrations] = await Promise.all([salesApi.getAudit(), salesApi.getIntegrations()])
    setAuditEvents(audit.items)
    setIntegrationSettings(integrations.integrations)
  }, [])

  useEffect(() => {
    let active = true
    async function hydrate() {
      try {
        const remote = await salesApi.getState()
        if (!active) return
        if (Array.isArray(remote.value.customers) && Array.isArray(remote.value.followUps)) {
          setState({ customers: remote.value.customers, followUps: remote.value.followUps })
        } else {
          await salesApi.putState(state)
        }
        await refreshAdminData()
        if (active) setServerStatus('connected')
      } catch {
        if (active) setServerStatus('offline')
      } finally {
        hydrated.current = true
      }
    }
    void hydrate()
    return () => { active = false }
  }, [refreshAdminData])

  useEffect(() => {
    if (!hydrated.current || serverStatus !== 'connected') return
    const timer = window.setTimeout(() => {
      void salesApi.putState(state).then(refreshAdminData).catch(() => setServerStatus('offline'))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [refreshAdminData, serverStatus, state])

  const addCustomers = useCallback((items: Customer[]) => {
    setState((current) => ({ ...current, customers: [...items, ...current.customers] }))
  }, [])

  const addFollowUp = useCallback((item: FollowUp) => {
    setState((current) => ({
      followUps: [item, ...current.followUps],
      customers: current.customers.map((customer) => customer.id === item.customerId ? {
        ...customer,
        lastContactAt: item.at,
        nextFollowUpAt: item.nextAt || undefined,
      } : customer),
    }))
  }, [])

  const updateCustomer = useCallback((id: string, changes: Partial<Customer>) => {
    setState((current) => ({ ...current, customers: current.customers.map((item) => item.id === id ? { ...item, ...changes } : item) }))
  }, [])

  const replaceState = useCallback((next: SalesState) => setState(next), [])
  const saveIntegrations = useCallback(async (settings: Record<string, Record<string, unknown>>) => {
    const result = await salesApi.putIntegrations(settings)
    setIntegrationSettings(result.integrations)
    await refreshAdminData()
  }, [refreshAdminData])
  const value = useMemo(() => ({ ...state, addCustomers, addFollowUp, replaceState, updateCustomer, serverStatus, auditEvents, integrationSettings, refreshAdminData, saveIntegrations }), [addCustomers, addFollowUp, auditEvents, integrationSettings, refreshAdminData, replaceState, saveIntegrations, serverStatus, state, updateCustomer])

  return <SalesDataContext.Provider value={value}>{children}</SalesDataContext.Provider>
}

export function useSalesData() {
  const value = useContext(SalesDataContext)
  if (!value) throw new Error('useSalesData must be used inside SalesDataProvider')
  return value
}
