import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AlertCircle, Check, KeyRound, LoaderCircle, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { salesApi, type CreateAccountInput, type RemoteAccount } from '../../api/salesApi'
import { ALL_PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS, hasPermission, type TeamRole } from './access'
import type { TeamMember } from './members'
import './team.css'

const TEAM_ROLES: TeamRole[] = ['manager', 'sales', 'designer', 'operations', 'aftersales']

export interface TeamAccessPageProps {
  members?: TeamMember[]
  initialMembers?: TeamMember[]
  storageKey?: string
  onMembersChange?: (members: TeamMember[]) => void
  onActiveMemberChange?: (member: TeamMember) => void
}

const formatLogin = (value?: string | null) => value
  ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '尚未登录'

function errorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : ''
  if (text.includes('409')) return '用户名已存在，请更换后重试。'
  if (text.includes('403')) return '当前账号没有管理成员的权限。'
  return '操作未完成，请检查网络后重试。'
}

export function TeamAccessPage(_props: TeamAccessPageProps) {
  const [accounts, setAccounts] = useState<RemoteAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<'add' | 'reset' | null>(null)
  const [selected, setSelected] = useState<RemoteAccount | null>(null)
  const [busyId, setBusyId] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try { setAccounts((await salesApi.getAccounts()).accounts) }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const roleCounts = useMemo(() => ({
    manager: accounts.filter((item) => item.active && item.role === 'manager').length,
    sales: accounts.filter((item) => item.active && item.role === 'sales').length,
    designer: accounts.filter((item) => item.active && item.role === 'designer').length,
    operations: accounts.filter((item) => item.active && item.role === 'operations').length,
    aftersales: accounts.filter((item) => item.active && item.role === 'aftersales').length,
  }), [accounts])

  const toggleActive = async (account: RemoteAccount) => {
    setBusyId(account.id); setError('')
    try {
      const { account: updated } = await salesApi.setAccountActive(account.id, !account.active)
      setAccounts((items) => items.map((item) => item.id === updated.id ? updated : item))
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setBusyId('') }
  }

  return <main className="team-access" aria-labelledby="team-title">
    <header className="team-header"><div><p>团队与安全</p><h1 id="team-title">成员账号管理</h1><span>创建员工账号，控制登录状态与岗位权限</span></div><button type="button" onClick={() => setDialog('add')}><UserPlus size={17}/>新增账号</button></header>
    <aside className="team-security-note secure"><ShieldCheck size={19}/><div><strong>账号由服务端安全管理</strong><span>初始密码仅用于首次登录，员工登录后须修改密码；停用账号会阻止其继续访问系统。</span></div></aside>
    {error && <div className="team-feedback error" role="alert"><AlertCircle size={17}/><span>{error}</span><button type="button" onClick={() => void load()}>重试</button></div>}
    <div className="team-layout">
      <section className="team-panel"><header><div><h2>登录账号</h2><p>{accounts.filter((item) => item.active).length} 个启用账号</p></div><div className="role-counts">{TEAM_ROLES.map((role) => <span key={role}>{ROLE_LABELS[role]} {roleCounts[role]}</span>)}</div></header>
        {loading ? <div className="team-empty"><LoaderCircle className="spin"/><span>正在读取账号...</span></div> : accounts.length === 0 ? <div className="team-empty"><Users/><span>还没有员工账号</span><button type="button" onClick={() => setDialog('add')}>创建第一个账号</button></div> : <div className="member-table" role="table">
          <div className="member-row account-row member-head" role="row"><span>成员</span><span>角色</span><span>最近登录</span><span>状态与操作</span></div>
          {accounts.map((account) => <div className="member-row account-row" role="row" key={account.id}><div className="member-name"><b>{account.name.slice(0, 1)}</b><span><strong>{account.name}</strong><small>@{account.username}{account.mustChangePassword ? ' · 待修改初始密码' : ''}</small></span></div><span className="account-role">{ROLE_LABELS[account.role]}</span><small className="last-login">{formatLogin(account.lastLoginAt)}</small><div className="account-actions"><span className={account.active ? 'status-active' : 'status-off'}>{account.active ? '已启用' : '已停用'}</span><button type="button" title="重置密码" aria-label={`重置 ${account.name} 的密码`} onClick={() => { setSelected(account); setDialog('reset') }}><KeyRound size={15}/></button><button className="status-button" type="button" disabled={busyId === account.id} onClick={() => void toggleActive(account)}>{busyId === account.id ? '处理中' : account.active ? '停用' : '启用'}</button></div></div>)}
        </div>}
      </section>
      <PermissionMatrix />
    </div>
    {dialog === 'add' && <AddAccountDialog onClose={() => setDialog(null)} onAdd={(account) => { setAccounts((items) => [...items, account]); setDialog(null) }} onError={setError}/>} 
    {dialog === 'reset' && selected && <ResetPasswordDialog account={selected} onClose={() => { setDialog(null); setSelected(null) }} onError={setError}/>} 
  </main>
}

function PermissionMatrix() {
  return <section className="team-panel matrix-panel"><header><div><h2>权限矩阵</h2><p>岗位权限由系统统一控制，员工不能自行修改</p></div></header><div className="permission-matrix five-roles" role="table"><div className="matrix-row matrix-head" role="row"><span>功能范围</span>{TEAM_ROLES.map((role) => <strong key={role}>{ROLE_LABELS[role]}</strong>)}</div>{ALL_PERMISSIONS.map((permission) => <div className="matrix-row" role="row" key={permission}><span>{PERMISSION_LABELS[permission]}</span>{TEAM_ROLES.map((role) => { const allowed = hasPermission(role, permission); return <i className={allowed ? 'granted' : 'denied'} key={role} aria-label={`${ROLE_LABELS[role]}${allowed ? '允许' : '不允许'}`}>{allowed ? <Check/> : <X/>}</i> })}</div>)}</div></section>
}

function AddAccountDialog({ onClose, onAdd, onError }: { onClose: () => void; onAdd: (account: RemoteAccount) => void; onError: (message: string) => void }) {
  const [form, setForm] = useState<CreateAccountInput>({ username: '', name: '', role: 'sales', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setSubmitting(true); onError(''); try { onAdd((await salesApi.createAccount({ ...form, username: form.username.trim(), name: form.name.trim() })).account) } catch (cause) { onError(errorMessage(cause)) } finally { setSubmitting(false) } }
  return <Dialog title="新增员工账号" onClose={onClose}><form onSubmit={submit}><label>登录用户名<input autoFocus required minLength={3} pattern="[A-Za-z0-9._-]+" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="如：liuming"/><small>3 位以上，可使用字母、数字、点、横线和下划线</small></label><label>员工姓名<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入员工姓名"/></label><label>岗位角色<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamRole })}><option value="sales">销售</option><option value="designer">设计师</option><option value="operations">运营</option><option value="aftersales">售后</option><option value="manager">店长</option></select></label><PasswordField value={form.password} onChange={(password) => setForm({ ...form, password })}/><footer><button type="button" className="secondary" onClick={onClose}>取消</button><button type="submit" disabled={submitting}>{submitting ? '正在创建...' : '创建账号'}</button></footer></form></Dialog>
}

function ResetPasswordDialog({ account, onClose, onError }: { account: RemoteAccount; onClose: () => void; onError: (message: string) => void }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setSubmitting(true); onError(''); try { await salesApi.resetAccountPassword(account.id, password); onClose() } catch (cause) { onError(errorMessage(cause)) } finally { setSubmitting(false) } }
  return <Dialog title={`重置 ${account.name} 的密码`} onClose={onClose}><form onSubmit={submit}><p className="dialog-hint">重置后，该员工下次登录必须修改此初始密码。</p><PasswordField value={password} onChange={setPassword}/><footer><button type="button" className="secondary" onClick={onClose}>取消</button><button type="submit" disabled={submitting}>{submitting ? '正在重置...' : '确认重置'}</button></footer></form></Dialog>
}

function PasswordField({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label>初始密码<input required type="password" minLength={10} value={value} onChange={(e) => onChange(e.target.value)} placeholder="至少 10 位字符"/><small>建议同时包含字母、数字和符号</small></label> }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="team-dialog-backdrop" role="presentation"><section className="team-dialog" role="dialog" aria-modal="true" aria-labelledby="team-dialog-title"><header><div><p>账号安全</p><h2 id="team-dialog-title">{title}</h2></div><button type="button" aria-label="关闭" onClick={onClose}><X/></button></header>{children}</section></div> }

export default TeamAccessPage
