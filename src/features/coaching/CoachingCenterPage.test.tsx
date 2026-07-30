import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { customers, followUps } from '../../data'
import { CoachingCenterPage } from './CoachingCenterPage'

describe('CoachingCenterPage', () => {
  const now = new Date('2026-07-30T12:00:00+08:00')
  it('shows the team and a transparent personal diagnosis', () => {
    render(<CoachingCenterPage customers={customers} followUps={followUps} now={now}/>)
    expect(screen.getByRole('heading', { name:'让每次复盘都有数据依据' })).toBeInTheDocument()
    expect(screen.getByText('团队表现')).toBeInTheDocument()
    expect(screen.getByText('综合分计算依据')).toBeInTheDocument()
    expect(screen.getByText('有效记录率')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name:/林晓/ }))
    expect(screen.getByText('林晓', { selector:'.score-panel p' })).toBeInTheDocument()
    expect(screen.getByText(/当前样本少于3个客户或3条记录/)).toBeInTheDocument()
    expect(screen.getByText('本周训练任务')).toBeInTheDocument()
  })
  it('shows a complete empty state', () => {
    render(<CoachingCenterPage customers={[]} followUps={[]} now={now}/>)
    expect(screen.getByText('暂无可分析数据')).toBeInTheDocument()
  })
})
