import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { customers, followUps } from '../../data'
import { TaskCenterPage } from './TaskCenterPage'

describe('TaskCenterPage', () => {
  const now = new Date('2026-07-30T12:00:00+08:00')
  it('renders categories and actionable customer details', () => {
    render(<TaskCenterPage customers={customers} followUps={followUps} onCompleteTask={() => {}} now={now} />)
    expect(screen.getByRole('heading', { name:'跟进任务中心' })).toBeInTheDocument()
    expect(screen.getByText('张女士')).toBeInTheDocument()
    expect(screen.getByText(/预计成交\s*[¥￥]86,000/)).toBeInTheDocument()
    expect(screen.getByText('已报价')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name:/逾期/ }))
    expect(screen.getByText('超期 1 天')).toBeInTheDocument()
  })

  it('submits a completed task as a FollowUp', () => {
    const complete = vi.fn()
    render(<TaskCenterPage customers={customers} followUps={followUps} onCompleteTask={complete} now={now} />)
    fireEvent.click(screen.getByRole('button', { name:'完成跟进' }))
    fireEvent.change(screen.getByLabelText('沟通内容'), { target:{ value:'客户确认方案细节' } })
    fireEvent.change(screen.getByLabelText('跟进结果'), { target:{ value:'等待最终确认' } })
    fireEvent.change(screen.getByLabelText('下次动作'), { target:{ value:'确认签约时间' } })
    fireEvent.click(screen.getByRole('button', { name:/确认完成/ }))
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ customerId:'c1', salesperson:'林晓', channel:'微信', content:'客户确认方案细节', result:'等待最终确认', nextAction:'确认签约时间', at:now.toISOString() }))
  })
})
