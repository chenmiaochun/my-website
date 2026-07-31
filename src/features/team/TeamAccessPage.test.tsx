import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamAccessPage } from './TeamAccessPage'

const accounts = [{ id: 'a1', username: 'manager', name: '陈店长', role: 'manager' as const, active: true, mustChangePassword: false }]
vi.mock('../../api/salesApi', () => ({ salesApi: {
  getAccounts: vi.fn(async () => ({ accounts })),
  createAccount: vi.fn(async (input) => ({ account: { id: 'a2', ...input, active: true, mustChangePassword: true } })),
  updateAccount: vi.fn(async (id, input) => ({ account: { ...accounts[0], ...input, id } })),
  deleteAccount: vi.fn(async () => undefined),
  setAccountActive: vi.fn(async (id, active) => ({ account: { ...accounts[0], id, active } })),
  resetAccountPassword: vi.fn(async () => ({ ok: true })),
} }))

describe('TeamAccessPage', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders secure account management and permission matrix', async () => {
    render(<TeamAccessPage storageKey="team-test" />)
    expect(await screen.findByText('账号由服务端安全管理')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '权限矩阵' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('设计师不允许').length).toBeGreaterThan(0)
    expect(screen.queryByText('售后')).not.toBeInTheDocument()
  })

  it('can disable an account', async () => {
    render(<TeamAccessPage />)
    fireEvent.click(await screen.findByRole('button', { name: '禁用' }))
    expect(await screen.findByText('禁用')).toBeInTheDocument()
  })

})
