import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { canAccessCustomer, hasPermission, type AccessPermission, type CustomerAccessSubject, type RoleIdentity, type TeamRole } from './access'

export interface RoleAccessValue {
  identity: RoleIdentity
  role: TeamRole
  can: (permission: AccessPermission) => boolean
  canAccessCustomer: (customer: CustomerAccessSubject) => boolean
}

const RoleAccessContext = createContext<RoleAccessValue | null>(null)

export interface RoleProviderProps {
  identity?: RoleIdentity
  role?: TeamRole
  children: ReactNode
}

export function RoleProvider({ identity, role = 'sales', children }: RoleProviderProps) {
  const resolved = identity ?? { id: 'local-demo-user', name: '本地演示用户', role }
  const value = useMemo<RoleAccessValue>(() => ({
    identity: resolved,
    role: resolved.role,
    can: (permission) => hasPermission(resolved.role, permission) || Boolean(resolved.canDesign && permission === 'customers.design'),
    canAccessCustomer: (customer) => canAccessCustomer(resolved, customer),
  }), [resolved.id, resolved.name, resolved.role])

  return <RoleAccessContext.Provider value={value}>{children}</RoleAccessContext.Provider>
}

export function useRoleAccess(): RoleAccessValue {
  const context = useContext(RoleAccessContext)
  if (!context) throw new Error('useRoleAccess 必须在 RoleProvider 内使用')
  return context
}
