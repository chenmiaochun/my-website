import { describe, expect, it } from 'vitest'
import type { Customer, FollowUp } from '../../types'
import { createBackup, validateBackup } from './backup'

const customer: Customer = { id: 'c1', name: '张女士', phone: '13800000000', source: '到店', salesperson: '小林', stage: '需求确认', intent: '高', expectedAmount: 120000, products: ['衣柜'], style: '现代', budget: '10-15万', renovationProgress: '毛坯', concerns: ['工期'], lastContactAt: '2026-07-30T08:00:00Z', createdAt: '2026-07-01T08:00:00Z' }
const followUp: FollowUp = { id: 'f1', customerId: 'c1', at: '2026-07-30T08:00:00Z', channel: '微信', content: '确认需求', result: '待量房', salesperson: '小林' }

describe('backup validation', () => {
  it('accepts a complete customer and follow-up backup', () => {
    const result = validateBackup(createBackup([customer], [followUp], new Date('2026-07-30T00:00:00Z')))
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.customers[0].name).toBe('张女士')
  })

  it('rejects malformed customer and follow-up fields', () => {
    const invalid = createBackup([{ ...customer, expectedAmount: Number.NaN }], [{ ...followUp, channel: '邮件' as FollowUp['channel'] }])
    const result = validateBackup(invalid)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toContain('customers[0].expectedAmount 必须是有限数字')
      expect(result.errors).toContain('followUps[0].channel 无效')
    }
  })

  it('rejects non-object and unsupported versions', () => {
    expect(validateBackup([])).toEqual({ valid: false, errors: ['备份根节点必须是对象'] })
    const result = validateBackup({ ...createBackup([], []), version: 2 })
    expect(result.valid).toBe(false)
  })
})
