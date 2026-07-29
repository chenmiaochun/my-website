import { describe, expect, it } from 'vitest'
import type { Customer, FollowUp } from '../../types'
import { scoreCustomer } from './scoring'

const baseCustomer: Customer = {
  id: 'c1', name: '张女士', phone: '13800000000', source: '到店', salesperson: '小林', stage: '已报价', intent: '高', expectedAmount: 80000,
  products: ['客厅套系'], style: '现代', budget: '8-10万', renovationProgress: '硬装收尾', concerns: ['价格对比'],
  lastContactAt: '2026-07-29T10:00:00+08:00', nextFollowUpAt: '2026-07-31T10:00:00+08:00', createdAt: '2026-07-01',
}
const followUp: FollowUp = { id: 'f1', customerId: 'c1', at: '2026-07-29T10:00:00+08:00', channel: '微信', content: '客户正在比较报价', result: '已发送材料说明', nextAction: '确认决策人', nextAt: '2026-07-31T10:00:00+08:00', salesperson: '小林' }
const now = new Date('2026-07-30T10:00:00+08:00')

describe('scoreCustomer', () => {
  it('returns all four scores with traceable evidence', () => {
    const report = scoreCustomer(baseCustomer, [followUp], now)
    expect(Object.keys(report.dimensions)).toEqual(['成交意向', '需求成熟度', '关系活跃度', '跟进健康度'])
    Object.values(report.dimensions).forEach((item) => {
      expect(item.score).toBeGreaterThanOrEqual(0)
      expect(item.score).toBeLessThanOrEqual(100)
      expect(item.evidence.length).toBeGreaterThan(0)
      expect(item.evidence.every((evidence) => Boolean(evidence.detail))).toBe(true)
    })
    expect(report.overallScore).toBe(99)
    expect(report.risks).toContain('客户正在比价，需强化差异价值')
  })

  it('flags overdue follow-up and missing information', () => {
    const sparse: Customer = { ...baseCustomer, intent: '低', products: [], style: '', budget: '', renovationProgress: '', concerns: [], lastContactAt: '2026-07-01T10:00:00+08:00', nextFollowUpAt: '2026-07-02T10:00:00+08:00' }
    const report = scoreCustomer(sparse, [], now)
    expect(report.missingInformation).toEqual(expect.arrayContaining(['意向产品', '预算范围', '明确的下一步行动']))
    expect(report.risks.some((risk) => risk.includes('逾期'))).toBe(true)
    expect(report.nextActions[0].priority).toBe('高')
    expect(report.dimensions['跟进健康度'].score).toBe(0)
  })

  it('is deterministic when the reference time is fixed', () => {
    expect(scoreCustomer(baseCustomer, [followUp], now)).toEqual(scoreCustomer(baseCustomer, [followUp], now))
  })
})
