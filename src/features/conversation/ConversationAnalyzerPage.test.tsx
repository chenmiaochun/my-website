import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Customer } from '../../types'
import { ConversationAnalyzerPage } from './ConversationAnalyzerPage'

const customer: Customer = { id:'c1', name:'陈女士', phone:'13800000000', source:'微信', salesperson:'林晓', stage:'已初聊', intent:'中', expectedAmount:80000, products:[], style:'', budget:'', renovationProgress:'', concerns:[], lastContactAt:'2026-07-20', createdAt:'2026-07-01' }

describe('ConversationAnalyzerPage', () => {
  it('requires confirmation before writing analysis back', () => {
    const apply = vi.fn()
    render(<ConversationAnalyzerPage customers={[customer]} onApplyAnalysis={apply} />)
    fireEvent.change(screen.getByLabelText('微信或电话沟通文本'), { target: { value:'客户：预算10万，想做衣柜，喜欢原木风。\n客户：价格合适就下单。' } })
    fireEvent.click(screen.getByRole('button', { name:'开始本地分析' }))
    expect(screen.getByText('10万')).toBeInTheDocument()
    expect(screen.getAllByText(/原文 · 第 1 行/).length).toBeGreaterThan(0)
    expect(apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name:'确认并回写' }))
    expect(apply).toHaveBeenCalledWith('c1', expect.objectContaining({ budget:'10万', products:['衣柜'], style:'原木风' }), expect.objectContaining({ customerId:'c1', channel:'微信' }))
  })
})
