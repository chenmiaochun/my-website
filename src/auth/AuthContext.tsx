import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, salesApi } from '../api/salesApi'
import type { TeamMember } from '../features/team'

interface AuthValue {
  user: TeamMember | null
  status: 'loading' | 'authenticated' | 'anonymous'
  notice: string
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearNotice: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TeamMember | null>(null)
  const [status, setStatus] = useState<AuthValue['status']>('loading')
  const [notice, setNotice] = useState('')

  const checkSession = useCallback(async () => {
    try {
      const result = await salesApi.getCurrentUser<TeamMember>()
      setUser(result.user)
      setStatus('authenticated')
    } catch (error) {
      setUser(null)
      setStatus('anonymous')
      if (!(error instanceof ApiError && error.status === 401)) setNotice('暂时无法连接服务器，请稍后重试')
    }
  }, [])

  useEffect(() => { void checkSession() }, [checkSession])
  useEffect(() => {
    const expire = () => { setUser(null); setStatus('anonymous'); setNotice('登录已过期，请重新登录') }
    window.addEventListener('sales-crm:session-expired', expire)
    return () => window.removeEventListener('sales-crm:session-expired', expire)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await salesApi.login<TeamMember>(username, password)
    setUser(result.user)
    setStatus('authenticated')
    setNotice('')
  }, [])
  const logout = useCallback(async () => {
    try { await salesApi.logout() } finally { setUser(null); setStatus('anonymous'); setNotice('已安全退出') }
  }, [])
  const value = useMemo(() => ({ user, status, notice, login, logout, clearNotice: () => setNotice('') }), [login, logout, notice, status, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return value
}
