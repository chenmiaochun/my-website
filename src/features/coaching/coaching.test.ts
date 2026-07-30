import { describe, expect, it } from 'vitest'
import type { Customer, FollowUp } from '../../types'
import { buildCoachingReport } from './coaching'

const base = { phone:'1', source:'转介绍', products:[], style:'', budget:'', renovationProgress:'', concerns:[], intent:'高' as const }
const customers: Customer[] = [
  { ...base, id:'c1', name:'甲', salesperson:'林晓', stage:'已报价', expectedAmount:100000, lastContactAt:'2026-07-29T10:00:00+08:00', nextFollowUpAt:'2026-07-29T12:00:00+08:00', createdAt:'2026-07-01' },
  { ...base, id:'c2', name:'乙', salesperson:'林晓', stage:'需求确认', expectedAmount:50000, lastContactAt:'2026-07-20T10:00:00+08:00', nextFollowUpAt:'2026-07-25T12:00:00+08:00', createdAt:'2026-07-02' },
  { ...base, id:'c3', name:'丙', salesperson:'周然', stage:'已成交', expectedAmount:80000, lastContactAt:'2026-07-28', createdAt:'2026-07-03' },
]
const followUps: FollowUp[] = [
  { id:'f1', customerId:'c1', at:'2026-07-29T11:00:00+08:00', channel:'微信', content:'客户确认报价可以接受，等待家人意见', result:'报价已认可', nextAction:'确认决策结果', nextAt:'2026-07-31T10:00:00+08:00', salesperson:'林晓' },
  { id:'f2', customerId:'c2', at:'2026-07-29T13:00:00+08:00', channel:'电话', content:'问候', result:'无', salesperson:'林晓' },
]

describe('buildCoachingReport', () => {
  const now = new Date('2026-07-30T12:00:00+08:00')
  it('calculates transparent coaching metrics and risk amount', () => {
    const lin = buildCoachingReport(customers, followUps, now).members.find((item) => item.salesperson === '林晓')!
    expect(lin.timelyRate).toMatchObject({ value:50, numerator:1, denominator:2 })
    expect(lin.effectiveRecordRate).toMatchObject({ value:50, numerator:1, denominator:2 })
    expect(lin.nextPlanRate).toMatchObject({ value:50, numerator:1, denominator:2 })
    expect(lin.stageHealthRate).toMatchObject({ value:50, numerator:1, denominator:2 })
    expect(lin.score).toBe(50)
    expect(lin.scoreExplanation).toContain('及时跟进 50% × 30%')
    expect(lin.riskCustomerCount).toBe(1)
    expect(lin.reviewCases[0]).toMatchObject({ customerId:'c2', amount:50000 })
  })
  it('excludes closed customers from opportunity and health denominators', () => {
    const zhou = buildCoachingReport(customers, followUps, now).members.find((item) => item.salesperson === '周然')!
    expect(zhou.opportunityAmount).toBe(0)
    expect(zhou.stageHealthRate.denominator).toBe(0)
    expect(zhou.lowData).toBe(true)
  })
  it('returns a stable empty report', () => {
    const report = buildCoachingReport([], [], now)
    expect(report.members).toEqual([])
    expect(report.team.score).toBe(0)
    expect(report.team.lowData).toBe(true)
  })
})
