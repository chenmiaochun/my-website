import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Check, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { ALL_PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS, hasPermission, type TeamRole } from './access'
import { defaultTeamMembers, type TeamMember } from './members'
import './team.css'

const DEFAULT_STORAGE_KEY = 'sales-crm-team-demo-v1'

export interface TeamAccessPageProps {
  members?: TeamMember[]
  initialMembers?: TeamMember[]
  storageKey?: string
  onMembersChange?: (members: TeamMember[]) => void
  onActiveMemberChange?: (member: TeamMember) => void
}

function readMembers(key: string, fallback: TeamMember[]): TeamMember[] {
  if (typeof window === 'undefined') return fallback
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '')
    return Array.isArray(value) ? value : fallback
  } catch { return fallback }
}

export function TeamAccessPage({ members: controlledMembers, initialMembers = defaultTeamMembers, storageKey = DEFAULT_STORAGE_KEY, onMembersChange, onActiveMemberChange }: TeamAccessPageProps) {
  const [localMembers, setLocalMembers] = useState<TeamMember[]>(() => readMembers(storageKey, initialMembers))
  const members = controlledMembers ?? localMembers
  const [activeId, setActiveId] = useState(() => members.find((member) => member.active)?.id ?? members[0]?.id ?? '')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (controlledMembers === undefined && typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(localMembers))
  }, [controlledMembers, localMembers, storageKey])

  const update = (next: TeamMember[]) => {
    if (controlledMembers === undefined) setLocalMembers(next)
    onMembersChange?.(next)
  }
  const active = members.find((member) => member.id === activeId) ?? members[0]
  const selectMember = (member: TeamMember) => { setActiveId(member.id); onActiveMemberChange?.(member) }
  const roleCounts = useMemo(() => ({
    manager: members.filter((item) => item.active && item.role === 'manager').length,
    sales: members.filter((item) => item.active && item.role === 'sales').length,
    designer: members.filter((item) => item.active && item.role === 'designer').length,
  }), [members])

  return <main className="team-access" aria-labelledby="team-title">
    <header className="team-header"><div><p>团队与权限</p><h1 id="team-title">成员角色管理</h1><span>维护团队状态，并预览不同岗位可见范围</span></div><button type="button" onClick={() => setAdding(true)}><UserPlus size={17}/>新增成员</button></header>
    <aside className="team-security-note"><AlertTriangle size={19}/><div><strong>这是本地角色演示</strong><span>角色切换和数据仅保存在当前浏览器。真实安全必须由服务端完成身份认证、数据过滤与接口鉴权，不能依赖前端隐藏。</span></div></aside>
    <section className="role-demo" aria-label="角色切换演示"><div><ShieldCheck/><span>当前演示身份</span><strong>{active ? `${active.name} · ${ROLE_LABELS[active.role]}` : '暂无成员'}</strong></div><label>切换成员<select value={active?.id ?? ''} onChange={(event) => { const member = members.find((item) => item.id === event.target.value); if (member) selectMember(member) }}>{members.filter((item) => item.active).map((member) => <option key={member.id} value={member.id}>{member.name} · {ROLE_LABELS[member.role]}</option>)}</select></label></section>
    <div className="team-layout">
      <section className="team-panel"><header><div><h2>成员列表</h2><p>{members.filter((item) => item.active).length} 位在职成员</p></div><div className="role-counts">{(['manager','sales','designer'] as TeamRole[]).map((role) => <span key={role}>{ROLE_LABELS[role]} {roleCounts[role]}</span>)}</div></header><div className="member-table" role="table"><div className="member-row member-head" role="row"><span>成员</span><span>角色</span><span>状态</span><span>操作</span></div>{members.map((member) => <div className="member-row" role="row" key={member.id}><div className="member-name"><b>{member.name.slice(0, 1)}</b><span><strong>{member.name}</strong><small>{member.phone ?? '未填写手机号'}</small></span></div><select aria-label={`切换 ${member.name} 的角色`} value={member.role} onChange={(event) => update(members.map((item) => item.id === member.id ? { ...item, role: event.target.value as TeamRole } : item))}><option value="manager">店长</option><option value="sales">销售</option><option value="designer">设计师</option></select><span className={member.active ? 'status-active' : 'status-off'}>{member.active ? '在职' : '已停用'}</span><button className="status-button" type="button" onClick={() => update(members.map((item) => item.id === member.id ? { ...item, active: !item.active } : item))}>{member.active ? '停用' : '启用'}</button></div>)}</div></section>
      <section className="team-panel matrix-panel"><header><div><h2>权限矩阵</h2><p>固定角色策略，便于主应用按权限点接线</p></div></header><div className="permission-matrix" role="table"><div className="matrix-row matrix-head" role="row"><span>功能范围</span>{(['manager','sales','designer'] as TeamRole[]).map((role) => <strong key={role}>{ROLE_LABELS[role]}</strong>)}</div>{ALL_PERMISSIONS.map((permission) => <div className="matrix-row" role="row" key={permission}><span>{PERMISSION_LABELS[permission]}</span>{(['manager','sales','designer'] as TeamRole[]).map((role) => { const allowed = hasPermission(role, permission); return <i className={allowed ? 'granted' : 'denied'} key={role} aria-label={`${ROLE_LABELS[role]}${allowed ? '允许' : '不允许'}`}>{allowed ? <Check/> : <X/>}</i> })}</div>)}</div></section>
    </div>
    {adding && <AddMemberDialog
      onClose={() => setAdding(false)}
      onAdd={(member) => { update([...members, member]); setAdding(false) }}
    />}
  </main>
}

function AddMemberDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (member: TeamMember) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<TeamRole>('sales')
  const submit = (event: FormEvent) => { event.preventDefault(); const trimmed = name.trim(); if (trimmed) onAdd({ id: `member-${Date.now()}`, name: trimmed, phone: phone.trim() || undefined, role, active: true }) }
  return <div className="team-dialog-backdrop" role="presentation"><section className="team-dialog" role="dialog" aria-modal="true" aria-labelledby="add-member-title"><header><div><p>团队成员</p><h2 id="add-member-title">新增成员</h2></div><button type="button" aria-label="关闭" onClick={onClose}><X/></button></header><form onSubmit={submit}><label>姓名<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入成员姓名"/></label><label>手机号（选填）<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="用于团队内部联系"/></label><label>角色<select value={role} onChange={(event) => setRole(event.target.value as TeamRole)}><option value="manager">店长</option><option value="sales">销售</option><option value="designer">设计师</option></select></label><footer><button type="button" className="secondary" onClick={onClose}>取消</button><button type="submit">确认新增</button></footer></form></section></div>
}

export default TeamAccessPage
