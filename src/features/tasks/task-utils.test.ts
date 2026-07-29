import { describe, expect, it } from 'vitest'
import type { Customer, FollowUp } from '../../types'
import { deriveFollowUpTasks, getOverdueDays, getTaskCategory, groupTasksBySchedule } from './task-utils'

const now = new Date('2026-07-30T12:00:00+08:00')
const base: Customer = { id:'c1', name:'测试客户', phone:'13800000000', source:'到店', salesperson:'林晓', stage:'已报价', intent:'高', expectedAmount:86000, products:['沙发'], style:'现代', budget:'8万', renovationProgress:'施工中', concerns:[], lastContactAt:'2026-07-29T10:00:00+08:00', createdAt:'2026-07-01' }

describe('task utilities', () => {
  it('classifies task dates by local calendar day with injected now', () => {
    expect(getTaskCategory('2026-07-30T08:00:00+08:00', now)).toBe('today')
    expect(getTaskCategory('2026-07-28T23:00:00+08:00', now)).toBe('overdue')
    expect(getTaskCategory('2026-08-01T09:00:00+08:00', now)).toBe('future')
    expect(getTaskCategory(undefined, now)).toBe('unscheduled')
    expect(getOverdueDays('2026-07-28T23:00:00+08:00', now)).toBe(2)
  })

  it('derives priorities and latest next actions from customer follow-ups', () => {
    const customers = [{ ...base, nextFollowUpAt:'2026-07-30T14:00:00+08:00' }, { ...base, id:'c2', name:'无计划客户', intent:'中' as const }]
    const records: FollowUp[] = [{ id:'f1', customerId:'c1', at:'2026-07-29T10:00:00+08:00', channel:'微信', content:'沟通', result:'已回复', nextAction:'发送新版报价', nextAt:'2026-07-30T14:00:00+08:00', salesperson:'林晓' }]
    const tasks = deriveFollowUpTasks(customers, records, now)
    expect(tasks[0]).toMatchObject({ category:'today', priority:'高', nextAction:'发送新版报价', overdueDays:0 })
    expect(tasks[1]).toMatchObject({ category:'unscheduled', nextAction:'制定首次跟进计划' })
  })

  it('groups scheduled and unscheduled tasks', () => {
    const tasks = deriveFollowUpTasks([{ ...base, nextFollowUpAt:'2026-07-30T14:00:00+08:00' }, { ...base, id:'c2' }], [], now)
    expect(groupTasksBySchedule(tasks).map((group) => group.key)).toEqual(['2026-07-30', 'unscheduled'])
  })
})
