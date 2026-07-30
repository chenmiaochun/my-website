import { describe, expect, it } from 'vitest'
import { canAccessCustomer, canViewRevenueSummary, getRolePermissions, hasPermission } from './access'

describe('team role access', () => {
  it('gives managers full store and member-management access', () => {
    expect(hasPermission('manager', 'store.analytics')).toBe(true)
    expect(hasPermission('manager', 'coaching')).toBe(true)
    expect(hasPermission('manager', 'data.manage')).toBe(true)
    expect(hasPermission('manager', 'members.manage')).toBe(true)
    expect(canViewRevenueSummary('manager')).toBe(true)
  })

  it('limits salespeople to their personal workflow', () => {
    expect(getRolePermissions('sales')).toEqual(['customers.own', 'tasks.own', 'conversation.analysis', 'sop'])
    expect(canAccessCustomer({ id: 's1', name: '小刘', role: 'sales' }, { salespersonId: 's1' })).toBe(true)
    expect(canAccessCustomer({ id: 's1', name: '小刘', role: 'sales' }, { salesperson: '小王' })).toBe(false)
    expect(canViewRevenueSummary('sales')).toBe(false)
  })

  it('lets designers see assigned customers but no revenue summary', () => {
    const designer = { id: 'd1', name: '林设计师', role: 'designer' as const }
    expect(canAccessCustomer(designer, { designerIds: ['d1'] })).toBe(true)
    expect(canAccessCustomer(designer, { designer: '其他设计师' })).toBe(false)
    expect(hasPermission('designer', 'customers.design')).toBe(true)
    expect(canViewRevenueSummary('designer')).toBe(false)
  })

  it('supports operations and aftersales store workflows', () => {
    expect(hasPermission('operations', 'store.analytics')).toBe(true)
    expect(canViewRevenueSummary('operations')).toBe(true)
    expect(hasPermission('aftersales', 'tasks.own')).toBe(true)
    expect(canAccessCustomer({ id: 'ops-1', name: '赵运营', role: 'operations' }, {})).toBe(true)
    expect(canAccessCustomer({ id: 'service-1', name: '孙售后', role: 'aftersales' }, {})).toBe(true)
  })
})
