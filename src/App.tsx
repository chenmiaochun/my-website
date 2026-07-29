import { BarChart3, Bell, Bot, ChartNoAxesCombined, ChevronDown, ClipboardList, ContactRound, Search, Settings, UserPlus } from 'lucide-react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AIQualityPage } from './features/ai'
import { CustomersPage } from './features/customers'
import { ManagerDashboard } from './features/dashboard'
import { SalesInsightsPage } from './features/insights'
import { LeadsPage } from './features/leads'
import { TaskCenterPage } from './features/tasks'
import { SalesDataProvider, useSalesData } from './store/SalesDataContext'

const navigation = [
  { to: '/dashboard', label: '经营分析', icon: BarChart3 },
  { to: '/customers', label: '客户跟进', icon: ContactRound },
  { to: '/tasks', label: '任务中心', icon: ClipboardList },
  { to: '/leads', label: '线索数据', icon: UserPlus },
  { to: '/quality', label: 'AI 质检', icon: Bot },
  { to: '/insights', label: '深度洞察', icon: ChartNoAxesCombined },
]

function AppShell() {
  const sales = useSalesData()
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand"><span className="brand-mark">尚</span><div><strong>尚品居</strong><small>销售工作台</small></div></div>
        <nav aria-label="主导航">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note"><span>今日进度</span><strong>3 / 5</strong><div><i /></div><small>还有 2 位客户待跟进</small></div>
        <button className="account" type="button"><span>林</span><div><strong>林晓</strong><small>销售顾问</small></div><ChevronDown size={15} /></button>
      </aside>

      <section className="app-main">
        <header className="app-topbar">
          <div className="topbar-search"><Search size={17} /><span>搜索客户、手机号或产品</span></div>
          <div className="topbar-actions">
            <button type="button" title="消息提醒"><Bell size={19} /><i>3</i></button>
            <button type="button" title="系统设置"><Settings size={19} /></button>
          </div>
        </header>
        <div className="app-content">
          <Routes>
            <Route path="/dashboard" element={<ManagerDashboard customers={sales.customers} followUps={sales.followUps} />} />
            <Route path="/customers" element={<CustomersPage customers={sales.customers} followUps={sales.followUps} onStateChange={sales.replaceState} />} />
            <Route path="/tasks" element={<TaskCenterPage customers={sales.customers} followUps={sales.followUps} onCompleteTask={sales.addFollowUp} />} />
            <Route path="/leads" element={<LeadsPage customers={sales.customers} onAddCustomers={sales.addCustomers} />} />
            <Route path="/quality" element={<AIQualityPage customers={sales.customers} followUps={sales.followUps} />} />
            <Route path="/insights" element={<SalesInsightsPage customers={sales.customers} followUps={sales.followUps} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </section>

      <nav className="mobile-nav" aria-label="移动端导航">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''}>
            <Icon size={20} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function App() { return <SalesDataProvider><AppShell /></SalesDataProvider> }
