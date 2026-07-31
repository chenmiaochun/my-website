import { useMemo, type ReactNode } from 'react'
import { BarChart3, Bell, Bot, ChartNoAxesCombined, ChevronDown, ClipboardList, ContactRound, Database, GraduationCap, LayoutGrid, ListChecks, LogOut, MessageSquareText, Search, Settings, UserCog, UserPlus } from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AIQualityPage } from './features/ai'
import { CustomersPage } from './features/customers'
import { ManagerDashboard } from './features/dashboard'
import { ConversationAnalyzerPage } from './features/conversation'
import { CoachingCenterPage } from './features/coaching'
import { SalesInsightsPage } from './features/insights'
import { LeadsPage } from './features/leads'
import { TaskCenterPage } from './features/tasks'
import { SalesSopPage } from './features/sop'
import { DataAdminPage, type ConnectionStatus } from './features/data-admin'
import { RoleProvider, ROLE_LABELS, TeamAccessPage, canAccessCustomer, useRoleAccess, type AccessPermission, type TeamMember } from './features/team'
import { SalesDataProvider, useSalesData } from './store/SalesDataContext'
import { LoginPage } from './auth/LoginPage'
import { useAuth } from './auth/AuthContext'

const navigation = [
  { to: '/dashboard', label: '经营分析', icon: BarChart3, permission: 'store.analytics' },
  { to: '/customers', label: '客户跟进', icon: ContactRound, permission: 'customers.own' },
  { to: '/tasks', label: '任务中心', icon: ClipboardList, permission: 'tasks.own' },
  { to: '/leads', label: '线索数据', icon: UserPlus, permission: 'customers.own' },
  { to: '/quality', label: 'AI 质检', icon: Bot, permission: 'store.analytics' },
  { to: '/conversation', label: '沟通分析', icon: MessageSquareText, permission: 'conversation.analysis' },
  { to: '/sop', label: '销售 SOP', icon: ListChecks, permission: 'sop' },
  { to: '/coaching', label: '辅导中心', icon: GraduationCap, permission: 'coaching' },
  { to: '/insights', label: '深度洞察', icon: ChartNoAxesCombined, permission: 'store.analytics' },
  { to: '/team', label: '团队权限', icon: UserCog, permission: 'members.manage' },
  { to: '/data-admin', label: '数据管理', icon: Database, permission: 'data.manage' },
]

type NavItem = typeof navigation[number]
const canUseItem = (can: (permission: AccessPermission) => boolean, item: NavItem) => item.to === '/customers' ? can('customers.own') || can('customers.design') : can(item.permission as AccessPermission)

function MorePage({ items }: { items: NavItem[] }) {
  return <main className="more-page"><header><p>尚品居销售工作台</p><h1>全部功能</h1></header><div className="module-grid">{items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={23} /><span>{label}</span></NavLink>)}</div></main>
}

function Allowed({ permission, children }: { permission: AccessPermission; children: ReactNode }) {
  const access = useRoleAccess()
  return access.can(permission) ? children : <Navigate to="/more" replace />
}

function AppShell({ activeMember }: { activeMember: TeamMember }) {
  const sales = useSalesData()
  const auth = useAuth()
  const access = useRoleAccess()
  const visibleNavigation = navigation.filter((item) => canUseItem(access.can, item))
  const visibleCustomers = useMemo(() => sales.customers.filter((customer) => canAccessCustomer(activeMember, customer)), [activeMember, sales.customers])
  const visibleIds = useMemo(() => new Set(visibleCustomers.map((item) => item.id)), [visibleCustomers])
  const visibleFollowUps = sales.followUps.filter((item) => visibleIds.has(item.customerId))
  const mergeVisibleState = (next: { customers: typeof sales.customers; followUps: typeof sales.followUps }) => {
    const updates = new Map(next.customers.map((item) => [item.id, item]))
    sales.replaceState({ customers: sales.customers.map((item) => updates.get(item.id) ?? item), followUps: [...next.followUps, ...sales.followUps.filter((item) => !visibleIds.has(item.customerId))], designTasks: sales.designTasks })
  }
  const wechat = sales.integrationSettings.wechat ?? {}
  const connectionStatus: ConnectionStatus = wechat.status === 'connected' ? 'connected' : wechat.corpId && wechat.agentId ? 'pending' : 'unconfigured'
  const mobileItems = [navigation[0], navigation[1], navigation[2], navigation[5]].filter((item) => visibleNavigation.includes(item))
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand"><span className="brand-mark">尚</span><div><strong>尚品居</strong><small>销售工作台</small></div></div>
        <nav aria-label="主导航">
          {visibleNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note"><span>今日进度</span><strong>3 / 5</strong><div><i /></div><small>还有 2 位客户待跟进</small></div>
        <div className="account"><span>{activeMember.name.slice(0, 1)}</span><div><strong>{activeMember.name}</strong><small>{ROLE_LABELS[activeMember.role]} · {sales.serverStatus === 'connected' ? '已同步' : '离线模式'}</small></div><ChevronDown size={15} /></div>
      </aside>

      <section className="app-main">
        <header className="app-topbar">
          <div className="topbar-search"><Search size={17} /><span>搜索客户、手机号或产品</span></div>
          <div className="topbar-actions">
            <button type="button" title="消息提醒"><Bell size={19} /><i>3</i></button>
            <button type="button" title="系统设置"><Settings size={19} /></button>
            <button type="button" title="退出登录" aria-label="退出登录" onClick={() => void auth.logout()}><LogOut size={19} /></button>
          </div>
        </header>
        <div className="app-content">
          <Routes>
            <Route path="/dashboard" element={<Allowed permission="store.analytics"><ManagerDashboard customers={sales.customers} followUps={sales.followUps} /></Allowed>} />
            <Route path="/customers" element={<CustomersPage customers={visibleCustomers} followUps={visibleFollowUps} designers={sales.designers} onStateChange={mergeVisibleState} onAddDesignTask={(task) => { sales.addDesignTask(task); sales.updateCustomer(task.customerId, { designerId: task.designerId, designer: task.designerName }) }} />} />
            <Route path="/tasks" element={<Allowed permission="tasks.own"><TaskCenterPage customers={visibleCustomers} followUps={visibleFollowUps} designTasks={sales.designTasks} activeMember={activeMember} onCompleteTask={sales.addFollowUp} onUpdateDesignTask={sales.updateDesignTask} /></Allowed>} />
            <Route path="/leads" element={<Allowed permission="customers.own"><LeadsPage customers={visibleCustomers} onAddCustomers={sales.addCustomers} /></Allowed>} />
            <Route path="/quality" element={<Allowed permission="store.analytics"><AIQualityPage customers={sales.customers} followUps={sales.followUps} /></Allowed>} />
            <Route path="/conversation" element={<Allowed permission="conversation.analysis"><ConversationAnalyzerPage customers={visibleCustomers} onApplyAnalysis={(id, patch, followUp) => { sales.updateCustomer(id, patch); sales.addFollowUp(followUp) }} /></Allowed>} />
            <Route path="/sop" element={<Allowed permission="sop"><SalesSopPage customers={visibleCustomers} followUps={visibleFollowUps} /></Allowed>} />
            <Route path="/coaching" element={<Allowed permission="coaching"><CoachingCenterPage customers={sales.customers} followUps={sales.followUps} /></Allowed>} />
            <Route path="/insights" element={<Allowed permission="store.analytics"><SalesInsightsPage customers={sales.customers} followUps={sales.followUps} /></Allowed>} />
            <Route path="/team" element={<Allowed permission="members.manage"><TeamAccessPage /></Allowed>} />
            <Route path="/data-admin" element={<Allowed permission="data.manage"><DataAdminPage customers={sales.customers} followUps={sales.followUps} auditEvents={sales.auditEvents.map((item) => ({ id: String(item.id), action: `${item.action} ${item.resource}`, at: item.createdAt, detail: JSON.stringify(item.details) }))} connectionStatus={connectionStatus} onRestoreBackup={(backup) => sales.replaceState({ customers: backup.customers, followUps: backup.followUps, designTasks: sales.designTasks })} integrationSettings={{ corpId: String(wechat.corpId ?? ''), agentId: String(wechat.agentId ?? ''), secretConfigured: Boolean(wechat.secretConfigured || wechat.secret) }} onSaveIntegration={async (settings) => sales.saveIntegrations({ ...sales.integrationSettings, wechat: { ...wechat, corpId: settings.corpId, agentId: settings.agentId, ...(settings.secret ? { secret: settings.secret } : {}), secretConfigured: Boolean(settings.secret || wechat.secretConfigured || wechat.secret), status: 'pending' } })} /></Allowed>} />
            <Route path="/more" element={<MorePage items={visibleNavigation} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </section>

      <nav className="mobile-nav" aria-label="移动端导航">
        {mobileItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''}>
            <Icon size={20} /><span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/more" className={({ isActive }) => isActive ? 'is-active' : ''}><LayoutGrid size={20} /><span>全部</span></NavLink>
      </nav>
    </div>
  )
}

export function App() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <main className="auth-loading">正在验证登录状态...</main>
  if (auth.status === 'anonymous') return <Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Navigate to="/login" state={{ from: location.pathname }} replace />} /></Routes>
  const activeMember = auth.user!
  return <SalesDataProvider><RoleProvider identity={activeMember}><Routes><Route path="/login" element={<Navigate to="/dashboard" replace />} /><Route path="*" element={<AppShell activeMember={activeMember} />} /></Routes></RoleProvider></SalesDataProvider>
}
