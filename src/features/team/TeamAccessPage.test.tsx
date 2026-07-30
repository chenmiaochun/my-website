import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamAccessPage } from './TeamAccessPage'

describe('TeamAccessPage', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders the local-security warning and permission matrix', () => {
    render(<TeamAccessPage storageKey="team-test" />)
    expect(screen.getByText('这是本地角色演示')).toBeInTheDocument()
    expect(screen.getByText(/真实安全必须由服务端/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '权限矩阵' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('设计师不允许').length).toBeGreaterThan(0)
  })

  it('changes roles, disables members and reports changes', () => {
    const onMembersChange = vi.fn()
    render(<TeamAccessPage storageKey="team-test" onMembersChange={onMembersChange} />)
    fireEvent.change(screen.getByLabelText('切换 刘先生 的角色'), { target: { value: 'designer' } })
    expect(onMembersChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ name: '刘先生', role: 'designer' })]))
    fireEvent.click(screen.getAllByRole('button', { name: '停用' })[0])
    expect(onMembersChange).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ name: '陈店长', active: false })]))
  })

  it('adds a member and persists the resulting local state', () => {
    render(<TeamAccessPage storageKey="team-test" />)
    fireEvent.click(screen.getByRole('button', { name: '新增成员' }))
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '赵设计' } })
    fireEvent.change(screen.getByLabelText('角色'), { target: { value: 'designer' } })
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }))
    expect(screen.getByText('赵设计')).toBeInTheDocument()
    expect(window.localStorage.getItem('team-test')).toContain('赵设计')
  })
})
