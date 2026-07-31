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
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === 'true'
const DEMO_MANAGER: TeamMember = { id: 'static-demo-manager', name: '访客店长', role: 'manager', active: true }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TeamMember | null>(STATIC_DEMO ? DEMO_MANAGER : null)
  const [status, setStatus] = useState<AuthValue['status']>(STATIC_DEMO ? 'authenticated' : 'loading')
  const [notice, setNotice] = useState('')

  const checkSession = useCallback(async () => {
    if (STATIC_DEMO) return
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
    if (STATIC_DEMO) { setUser(DEMO_MANAGER); setStatus('authenticated'); return }
    const result = await salesApi.login<TeamMember>(username, password)
    setUser(result.user)
    setStatus('authenticated')
    setNotice('')
  }, [])
  const logout = useCallback(async () => {
    if (STATIC_DEMO) { setNotice('公开试用版保持登录状态'); return }
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
