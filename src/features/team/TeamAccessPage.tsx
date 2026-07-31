import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, Check, CircleCheck, KeyRound, LoaderCircle, Pencil, RotateCw, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react'
import { salesApi, type CreateAccountInput, type RemoteAccount, type UpdateAccountInput } from '../../api/salesApi'
import { ALL_PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS, hasPermission, type TeamRole } from './access'
import type { TeamMember } from './members'
import './team.css'

const TEAM_ROLES: TeamRole[] = ['manager', 'sales', 'designer', 'operations']

export interface TeamAccessPageProps {
  members?: TeamMember[]
  initialMembers?: TeamMember[]
  storageKey?: string
  onMembersChange?: (members: TeamMember[]) => void
  onActiveMemberChange?: (member: TeamMember) => void
}

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
  : '-'

function errorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : ''
  if (text.includes('409')) return '登录账号已存在，请更换后重试。'
  if (text.includes('403')) return '当前账号没有管理成员的权限。'
  if (text.includes('400')) return '账号信息不符合要求，或该账号不能执行此操作。'
  return '操作未完成，请检查网络后重试。'
}

export function TeamAccessPage(_props: TeamAccessPageProps) {
  const [accounts, setAccounts] = useState<RemoteAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dialog, setDialog] = useState<'add' | 'edit' | 'reset' | 'delete' | null>(null)
  const [selected, setSelected] = useState<RemoteAccount | null>(null)
  const [busyId, setBusyId] = useState('')
  const [roleFilter, setRoleFilter] = useState<TeamRole | null>(null)

  const load = async (retry = false) => {
    retry ? setRetrying(true) : setLoading(true)
    setError('')
    try { setAccounts((await salesApi.getAccounts()).accounts) }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setLoading(false); setRetrying(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { if (!success) return; const timer = window.setTimeout(() => setSuccess(''), 3200); return () => window.clearTimeout(timer) }, [success])

  const roleCounts = useMemo(() => Object.fromEntries(TEAM_ROLES.map((role) => [role, accounts.filter((item) => item.role === role).length])) as Record<TeamRole, number>, [accounts])
  const visibleAccounts = roleFilter ? accounts.filter((item) => item.role === roleFilter) : accounts

  const openDialog = (next: typeof dialog, account: RemoteAccount | null = null) => { setSelected(account); setDialog(next) }
  const closeDialog = () => { setSelected(null); setDialog(null) }
  const showSuccess = (message: string) => { setSuccess(message); setError('') }

  const toggleActive = async (account: RemoteAccount) => {
    setBusyId(account.id); setError('')
    try {
      const { account: updated } = await salesApi.setAccountActive(account.id, !account.active)
      setAccounts((items) => items.map((item) => item.id === updated.id ? updated : item))
      showSuccess(`${account.name} 的账号已${updated.active ? '启用' : '禁用'}`)
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setBusyId('') }
  }

  return <main className="team-access" aria-labelledby="team-title">
    <header className="team-header"><div><p>团队与安全</p><h1 id="team-title">成员账号管理</h1><span>创建员工账号，分配岗位权限，管控登录状态。</span></div><button type="button" onClick={() => openDialog('add')}><UserPlus size={17}/>新增账号</button></header>
    <aside className="team-security-note secure"><ShieldCheck size={19}/><div><strong>账号由服务端安全管理</strong><span>初始密码仅用于首次登录，员工登录后须修改密码；停用账号会阻止其继续访问系统。</span></div></aside>
    {error && <div className="team-feedback warning" role="alert"><AlertTriangle size={17}/><span>{error}</span><button type="button" disabled={retrying} onClick={() => void load(true)}>{retrying ? <><LoaderCircle className="spin" size={15}/>重试中</> : <><RotateCw size={15}/>重试</>}</button></div>}
    {success && <div className="team-feedback success" role="status"><CircleCheck size={17}/><span>{success}</span></div>}
    <div className="team-layout">
      <section className="team-panel account-panel"><header><div><h2>登录账号</h2><p>{accounts.filter((item) => item.active).length} 个启用账号</p></div><div className="role-counts" aria-label="按角色筛选">{TEAM_ROLES.map((role) => <button type="button" aria-pressed={roleFilter === role} className={roleFilter === role ? 'selected' : ''} key={role} onClick={() => setRoleFilter((current) => current === role ? null : role)}>{ROLE_LABELS[role]} <b>{roleCounts[role]}</b></button>)}</div></header>
        {loading ? <div className="team-empty"><LoaderCircle className="spin"/><strong>正在读取账号...</strong></div> : visibleAccounts.length === 0 ? <div className="team-empty"><span className="empty-icon"><Users/></span><strong>暂无员工账号</strong><p>点击右上角「新增账号」即可创建员工账号并分配权限</p><button type="button" className="empty-create" onClick={() => openDialog('add')}><UserPlus size={15}/>立即创建</button></div> : <div className="member-table" role="table">
          <div className="member-row account-row member-head" role="row"><span>员工姓名</span><span>登录账号</span><span>所属角色</span><span>账号状态</span><span>创建时间</span><span>操作</span></div>
          {visibleAccounts.map((account) => <div className="member-row account-row" role="row" key={account.id}><div className="member-name"><b>{account.name.slice(0, 1)}</b><strong>{account.name}</strong></div><span className="account-username">{account.username}</span><span className="account-role">{ROLE_LABELS[account.role]}</span><span className={account.active ? 'status-active' : 'status-off'}>{account.active ? '启用' : '禁用'}</span><small className="created-at">{formatDate(account.createdAt)}</small><div className="account-actions"><button type="button" title="编辑" aria-label={`编辑 ${account.name}`} onClick={() => openDialog('edit', account)}><Pencil size={14}/></button><button type="button" title="重置密码" aria-label={`重置 ${account.name} 的密码`} onClick={() => openDialog('reset', account)}><KeyRound size={14}/></button><button className="status-button" type="button" disabled={busyId === account.id} onClick={() => void toggleActive(account)}>{busyId === account.id ? '处理中' : account.active ? '禁用' : '启用'}</button><button type="button" className="delete-button" title="删除" aria-label={`删除 ${account.name}`} onClick={() => openDialog('delete', account)}><Trash2 size={14}/></button></div></div>)}
        </div>}
      </section>
      <PermissionMatrix />
    </div>
    {dialog === 'add' && <AccountDialog mode="add" onClose={closeDialog} onSave={(account) => { setAccounts((items) => [...items, account]); closeDialog(); showSuccess(`员工账号「${account.name}」新增成功`) }} onError={setError}/>}
    {dialog === 'edit' && selected && <AccountDialog mode="edit" account={selected} onClose={closeDialog} onSave={(account) => { setAccounts((items) => items.map((item) => item.id === account.id ? account : item)); closeDialog(); showSuccess(`员工账号「${account.name}」已更新`) }} onError={setError}/>}
    {dialog === 'reset' && selected && <ResetPasswordDialog account={selected} onClose={closeDialog} onDone={() => showSuccess(`${selected.name} 的初始密码已重置`)} onError={setError}/>}
    {dialog === 'delete' && selected && <DeleteAccountDialog account={selected} onClose={closeDialog} onDeleted={() => { setAccounts((items) => items.filter((item) => item.id !== selected.id)); closeDialog(); showSuccess(`员工账号「${selected.name}」已删除`) }} onError={setError}/>}
  </main>
}

function PermissionMatrix() {
  return <section className="team-panel matrix-panel"><header><div><h2>权限矩阵</h2><p>各岗位可使用的系统功能范围</p></div></header><div className="permission-matrix" role="table"><div className="matrix-row matrix-head" role="row"><span>功能范围</span>{TEAM_ROLES.map((role) => <strong key={role}>{ROLE_LABELS[role]}</strong>)}</div>{ALL_PERMISSIONS.map((permission) => <div className="matrix-row" role="row" key={permission}><span>{PERMISSION_LABELS[permission]}</span>{TEAM_ROLES.map((role) => { const allowed = hasPermission(role, permission); return <i className={allowed ? 'granted' : 'denied'} key={role} aria-label={`${ROLE_LABELS[role]}${allowed ? '允许' : '不允许'}`}>{allowed ? <Check/> : <X/>}</i> })}</div>)}</div><p className="matrix-note">岗位权限由系统统一配置，员工无法自行修改，如需调整请联系店长。</p></section>
}

function AccountDialog({ mode, account, onClose, onSave, onError }: { mode: 'add' | 'edit'; account?: RemoteAccount; onClose: () => void; onSave: (account: RemoteAccount) => void; onError: (message: string) => void }) {
  const [form, setForm] = useState<CreateAccountInput>({ username: account?.username ?? '', name: account?.name ?? '', role: account?.role ?? 'sales', password: '', phone: account?.phone ?? '' })
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setSubmitting(true); onError(''); try { const input = { username: form.username.trim(), name: form.name.trim(), role: form.role, phone: form.phone?.trim() }; const result = mode === 'add' ? await salesApi.createAccount({ ...input, password: form.password }) : await salesApi.updateAccount(account!.id, input as UpdateAccountInput); onSave(result.account) } catch (cause) { onError(errorMessage(cause)) } finally { setSubmitting(false) } }
  return <Dialog title={mode === 'add' ? '新增员工账号' : '编辑员工账号'} onClose={onClose}><form onSubmit={submit}><label>员工姓名 <b>*</b><input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入员工姓名"/></label><label>登录账号 <b>*</b><input required minLength={3} pattern="[A-Za-z0-9._-]+" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="如：liuming"/></label>{mode === 'add' && <PasswordField value={form.password} onChange={(password) => setForm({ ...form, password })}/>}<label>所属角色 <b>*</b><select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamRole })}><option value="manager">店长</option><option value="sales">销售</option><option value="designer">设计师</option><option value="operations">运营</option></select></label><label>联系手机号（选填）<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="请输入联系手机号"/></label><footer><button type="button" className="secondary" onClick={onClose}>取消</button><button type="submit" disabled={submitting}>{submitting ? '正在保存...' : mode === 'add' ? '确认新增' : '保存修改'}</button></footer></form></Dialog>
}

function ResetPasswordDialog({ account, onClose, onDone, onError }: { account: RemoteAccount; onClose: () => void; onDone: () => void; onError: (message: string) => void }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setSubmitting(true); onError(''); try { await salesApi.resetAccountPassword(account.id, password); onClose(); onDone() } catch (cause) { onError(errorMessage(cause)) } finally { setSubmitting(false) } }
  return <Dialog title={`重置 ${account.name} 的密码`} onClose={onClose}><form onSubmit={submit}><p className="dialog-hint">重置后，该员工下次登录必须修改此初始密码。</p><PasswordField value={password} onChange={setPassword}/><footer><button type="button" className="secondary" onClick={onClose}>取消</button><button type="submit" disabled={submitting}>{submitting ? '正在重置...' : '确认重置'}</button></footer></form></Dialog>
}

function DeleteAccountDialog({ account, onClose, onDeleted, onError }: { account: RemoteAccount; onClose: () => void; onDeleted: () => void; onError: (message: string) => void }) {
  const [submitting, setSubmitting] = useState(false)
  const remove = async () => { setSubmitting(true); onError(''); try { await salesApi.deleteAccount(account.id); onDeleted() } catch (cause) { onError(errorMessage(cause)) } finally { setSubmitting(false) } }
  return <Dialog title="删除员工账号" onClose={onClose}><div className="delete-confirm"><AlertTriangle/><p>确认删除员工账号「{account.name}」？删除后无法恢复，该员工也将无法继续登录。</p><footer><button type="button" className="secondary" onClick={onClose}>取消</button><button type="button" className="danger" disabled={submitting} onClick={() => void remove()}>{submitting ? '正在删除...' : '确认删除'}</button></footer></div></Dialog>
}

function PasswordField({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label>初始密码 <b>*</b><input required type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="请输入 6 位数字"/><small>员工首次登录后须修改密码</small></label> }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="team-dialog-backdrop" role="presentation"><section className="team-dialog" role="dialog" aria-modal="true" aria-labelledby="team-dialog-title"><header><div><p>账号管理</p><h2 id="team-dialog-title">{title}</h2></div><button type="button" aria-label="关闭" onClick={onClose}><X/></button></header>{children}</section></div> }

export default TeamAccessPage
