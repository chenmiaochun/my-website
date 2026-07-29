import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

describe('App routes', () => {
  it('renders the manager dashboard', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('heading', { name: '经营总览' })).toBeTruthy()
  })

  it('renders the customer follow-up workspace', () => {
    renderAt('/customers')
    expect(screen.getByRole('heading', { name: '客户与跟进' })).toBeTruthy()
  })

  it('renders AI quality review', () => {
    renderAt('/quality')
    expect(screen.getByRole('heading', { name: '客户跟进质量与成交机会' })).toBeTruthy()
  })

  it.each([
    ['/tasks', '跟进任务中心'],
    ['/leads', '线索数据中心'],
    ['/insights', '从数据找到下一步增长'],
  ])('renders the phase two route %s', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
  })
})
