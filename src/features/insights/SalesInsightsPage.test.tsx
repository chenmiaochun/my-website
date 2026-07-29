import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { customers, followUps } from '../../data'
import { SalesInsightsPage } from './SalesInsightsPage'

describe('SalesInsightsPage', () => {
  const now = new Date('2026-07-30T12:00:00+08:00')
  it('renders every insight section and switches periods', () => {
    render(<SalesInsightsPage customers={customers} followUps={followUps} now={now} />)
    expect(screen.getByRole('heading', { name:'从数据找到下一步增长' })).toBeInTheDocument()
    expect(screen.getByText('业务趋势')).toBeInTheDocument()
    expect(screen.getByText('来源质量')).toBeInTheDocument()
    expect(screen.getByText('阶段停留风险')).toBeInTheDocument()
    expect(screen.getByText('跟进活动质量')).toBeInTheDocument()
    expect(screen.getByText('丢单原因')).toBeInTheDocument()
    expect(screen.getByText('销售辅导建议')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name:'近7天' }))
    expect(screen.getByRole('button', { name:'近7天' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('近7天动作完整度')).toBeInTheDocument()
  })
  it('shows a complete empty state', () => {
    render(<SalesInsightsPage customers={[]} followUps={[]} now={now} />)
    expect(screen.getByText('暂无经营数据')).toBeInTheDocument()
    expect(screen.getByText(/录入客户与跟进记录后/)).toBeInTheDocument()
  })
})
