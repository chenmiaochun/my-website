import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { customers as seedCustomers, followUps as seedFollowUps } from '../data'
import type { Customer, FollowUp } from '../types'

const STORAGE_KEY = 'shangpinju.customer-followup.v1'

interface SalesState { customers: Customer[]; followUps: FollowUp[] }
interface SalesDataValue extends SalesState {
  addCustomers: (items: Customer[]) => void
  addFollowUp: (item: FollowUp) => void
  replaceState: (state: SalesState) => void
  updateCustomer: (id: string, changes: Partial<Customer>) => void
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

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

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
  const value = useMemo(() => ({ ...state, addCustomers, addFollowUp, replaceState, updateCustomer }), [addCustomers, addFollowUp, replaceState, state, updateCustomer])

  return <SalesDataContext.Provider value={value}>{children}</SalesDataContext.Provider>
}

export function useSalesData() {
  const value = useContext(SalesDataContext)
  if (!value) throw new Error('useSalesData must be used inside SalesDataProvider')
  return value
}
