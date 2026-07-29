import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageSquarePlus,
  Phone,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react'
import { customers as seedCustomers, followUps as seedFollowUps } from '../../data'
import type { Customer, CustomerStage, FollowUp } from '../../types'
import './customers.css'

const STORAGE_KEY = 'shangpinju.customer-followup.v1'

const stages: CustomerStage[] = [
  '新线索', '已初聊', '需求确认', '到店/量房', '方案设计', '已报价',
  '方案调整', '已定金', '生产交付', '已成交', '已流失',
]

type StoredState = { customers: Customer[]; followUps: FollowUp[] }
type Channel = FollowUp['channel']

function readState(): StoredState {
  if (typeof window === 'undefined') return { customers: seedCustomers, followUps: seedFollowUps }
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as StoredState
      if (Array.isArray(parsed.customers) && Array.isArray(parsed.followUps)) return parsed
    }
  } catch {
    // Ignore unavailable or malformed browser storage and use the bundled data.
  }
  return { customers: seedCustomers, followUps: seedFollowUps }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value?: string) {
  if (!value) return '未安排'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

function toLocalInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function isOverdue(value?: string) {
  return Boolean(value && new Date(value).getTime() < Date.now())
}

export function CustomersPage() {
  const [state, setState] = useState<StoredState>(readState)
  const [selectedId, setSelectedId] = useState(seedCustomers[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<CustomerStage | '全部'>('全部')
  const [ownerFilter, setOwnerFilter] = useState('全部')
  const [taskFilter, setTaskFilter] = useState<'全部' | '待跟进' | '已逾期'>('全部')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* no-op */ }
  }, [state])

  const owners = useMemo(() => [...new Set(state.customers.map((item) => item.salesperson))], [state.customers])
  const filtered = useMemo(() => state.customers.filter((customer) => {
    const keyword = query.trim().toLowerCase()
    const matchesQuery = !keyword || [customer.name, customer.phone, customer.source, ...customer.products]
      .some((value) => value.toLowerCase().includes(keyword))
    const matchesStage = stageFilter === '全部' || customer.stage === stageFilter
    const matchesOwner = ownerFilter === '全部' || customer.salesperson === ownerFilter
    const matchesTask = taskFilter === '全部'
      || (taskFilter === '待跟进' && Boolean(customer.nextFollowUpAt))
      || (taskFilter === '已逾期' && isOverdue(customer.nextFollowUpAt))
    return matchesQuery && matchesStage && matchesOwner && matchesTask
  }), [ownerFilter, query, stageFilter, state.customers, taskFilter])

  const selected = state.customers.find((customer) => customer.id === selectedId)
  const timeline = useMemo(() => state.followUps
    .filter((item) => item.customerId === selectedId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()), [selectedId, state.followUps])

  function updateStage(stage: CustomerStage) {
    setState((current) => ({
      ...current,
      customers: current.customers.map((customer) => customer.id === selectedId ? { ...customer, stage } : customer),
    }))
  }

  function addFollowUp(data: Omit<FollowUp, 'id' | 'customerId' | 'salesperson'>) {
    if (!selected) return
    const record: FollowUp = {
      ...data,
      id: `followup-${Date.now()}`,
      customerId: selected.id,
      salesperson: selected.salesperson,
    }
    setState((current) => ({
      followUps: [record, ...current.followUps],
      customers: current.customers.map((customer) => customer.id === selected.id ? {
        ...customer,
        lastContactAt: data.at,
        nextFollowUpAt: data.nextAt || undefined,
      } : customer),
    }))
    setFormOpen(false)
  }

  return (
    <section className="customers-page" aria-label="客户与跟进">
      <header className="customers-header">
        <div>
          <p className="customers-eyebrow">客户经营</p>
          <h1>客户与跟进</h1>
          <p className="customers-summary">{state.customers.length} 位客户 · {state.customers.filter((c) => c.nextFollowUpAt).length} 项待跟进</p>
        </div>
        {selected && <button className="primary-button header-action" onClick={() => setFormOpen(true)}><MessageSquarePlus size={18} />新增跟进</button>}
      </header>

      <div className={`customers-workspace ${selected ? 'has-selection' : ''}`}>
        <aside className={`customer-list-panel ${selected ? 'mobile-hidden' : ''}`}>
          <div className="customer-tools">
            <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索客户、电话或产品" /></label>
            <div className="filter-row">
              <SlidersHorizontal size={16} aria-hidden="true" />
              <select aria-label="客户阶段" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as CustomerStage | '全部')}>
                <option>全部</option>{stages.map((stage) => <option key={stage}>{stage}</option>)}
              </select>
              <select aria-label="负责人" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                <option>全部</option>{owners.map((owner) => <option key={owner}>{owner}</option>)}
              </select>
            </div>
            <div className="segmented-control" aria-label="跟进状态">
              {(['全部', '待跟进', '已逾期'] as const).map((filter) => <button key={filter} className={taskFilter === filter ? 'active' : ''} onClick={() => setTaskFilter(filter)}>{filter}</button>)}
            </div>
          </div>
          <div className="list-count">{filtered.length} 位客户</div>
          <div className="customer-list">
            {filtered.map((customer) => (
              <button key={customer.id} className={`customer-row ${selectedId === customer.id ? 'selected' : ''}`} onClick={() => setSelectedId(customer.id)}>
                <span className={`intent-dot intent-${customer.intent}`} aria-label={`${customer.intent}意向`} />
                <span className="customer-row-main">
                  <span className="customer-row-title"><strong>{customer.name}</strong><span className="stage-tag">{customer.stage}</span></span>
                  <span className="customer-row-meta">{customer.phone} · {customer.source}</span>
                  <span className={`next-followup ${isOverdue(customer.nextFollowUpAt) ? 'overdue' : ''}`}><Clock3 size={14} />{customer.nextFollowUpAt ? `下次 ${formatDate(customer.nextFollowUpAt)}` : '暂无下一步任务'}</span>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
            {!filtered.length && <div className="empty-state"><Search size={24} /><strong>没有匹配的客户</strong><span>调整搜索词或筛选条件</span></div>}
          </div>
        </aside>

        <main className={`customer-detail ${!selected ? 'mobile-hidden' : ''}`}>
          {selected ? (
            <>
              <button className="mobile-back" onClick={() => setSelectedId('')}><ArrowLeft size={18} />返回客户列表</button>
              <div className="detail-heading">
                <div className="customer-avatar">{selected.name.slice(0, 1)}</div>
                <div><div className="title-line"><h2>{selected.name}</h2><span className={`intent-badge intent-${selected.intent}`}>{selected.intent}意向</span></div><p>{selected.phone} · 负责人 {selected.salesperson}</p></div>
                <a className="icon-button" href={`tel:${selected.phone.replace(/\*/g, '')}`} title="拨打电话" aria-label="拨打电话"><Phone size={19} /></a>
              </div>

              <div className="stage-editor">
                <label htmlFor="customer-stage">当前阶段</label>
                <select id="customer-stage" value={selected.stage} onChange={(event) => updateStage(event.target.value as CustomerStage)}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select>
                <span>变更后自动保存</span>
              </div>

              <section className={`next-task ${isOverdue(selected.nextFollowUpAt) ? 'task-overdue' : ''}`}>
                <div className="section-icon"><CalendarClock size={19} /></div>
                <div><span>下一步任务</span><strong>{timeline[0]?.nextAction || '尚未安排具体行动'}</strong><small>{selected.nextFollowUpAt ? `${formatDate(selected.nextFollowUpAt)} · ${selected.salesperson}` : '新增跟进时可同步安排'}</small></div>
                {selected.nextFollowUpAt && <span className="task-status">{isOverdue(selected.nextFollowUpAt) ? '已逾期' : '待执行'}</span>}
              </section>

              <section className="customer-profile">
                <div className="section-title"><h3>客户画像</h3><span>{formatMoney(selected.expectedAmount)} 预计成交</span></div>
                <dl>
                  <div><dt>意向产品</dt><dd>{selected.products.join('、')}</dd></div>
                  <div><dt>偏好风格</dt><dd>{selected.style}</dd></div>
                  <div><dt>客户预算</dt><dd>{selected.budget}</dd></div>
                  <div><dt>装修进度</dt><dd>{selected.renovationProgress}</dd></div>
                  <div><dt>主要顾虑</dt><dd className="concern-list">{selected.concerns.map((item) => <span key={item}>{item}</span>)}</dd></div>
                  <div><dt>客户来源</dt><dd>{selected.source}</dd></div>
                </dl>
              </section>

              <section className="timeline-section">
                <div className="section-title"><h3>跟进记录</h3><button className="text-button" onClick={() => setFormOpen(true)}><MessageSquarePlus size={16} />新增跟进</button></div>
                <div className="timeline">
                  {timeline.map((item) => <article className="timeline-item" key={item.id}>
                    <span className="timeline-marker"><CheckCircle2 size={16} /></span>
                    <div className="timeline-card">
                      <div className="timeline-meta"><strong>{item.channel}</strong><span>{formatDate(item.at)} · {item.salesperson}</span></div>
                      <p>{item.content}</p><div className="result-line"><span>结果</span>{item.result}</div>
                      {item.nextAction && <div className="action-line"><CalendarClock size={15} /><span><b>下一步：</b>{item.nextAction}{item.nextAt ? ` · ${formatDate(item.nextAt)}` : ''}</span></div>}
                    </div>
                  </article>)}
                  {!timeline.length && <div className="empty-state"><UserRound size={24} /><strong>还没有跟进记录</strong><span>记录第一次沟通，推进客户阶段</span></div>}
                </div>
              </section>
            </>
          ) : <div className="detail-placeholder"><UserRound size={34} /><strong>选择一位客户</strong><span>查看客户画像与跟进记录</span></div>}
        </main>
      </div>
      {formOpen && selected && <FollowUpDialog customer={selected} onClose={() => setFormOpen(false)} onSubmit={addFollowUp} />}
    </section>
  )
}

function FollowUpDialog({ customer, onClose, onSubmit }: { customer: Customer; onClose: () => void; onSubmit: (data: Omit<FollowUp, 'id' | 'customerId' | 'salesperson'>) => void }) {
  const [channel, setChannel] = useState<Channel>('微信')
  const [at, setAt] = useState(toLocalInput())
  const [content, setContent] = useState('')
  const [result, setResult] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextAt, setNextAt] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit({ channel, at: new Date(at).toISOString(), content: content.trim(), result: result.trim(), nextAction: nextAction.trim() || undefined, nextAt: nextAt ? new Date(nextAt).toISOString() : undefined })
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="followup-dialog" role="dialog" aria-modal="true" aria-labelledby="followup-title">
      <header><div><p>记录客户沟通</p><h2 id="followup-title">新增跟进 · {customer.name}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={20} /></button></header>
      <form onSubmit={submit}>
        <fieldset><legend>沟通方式</legend><div className="channel-options">{(['微信', '电话', '到店', '量房'] as Channel[]).map((item) => <label key={item}><input type="radio" name="channel" checked={channel === item} onChange={() => setChannel(item)} /><span>{item}</span></label>)}</div></fieldset>
        <label>跟进时间<input type="datetime-local" required value={at} onChange={(event) => setAt(event.target.value)} /></label>
        <label>沟通内容<textarea required rows={3} value={content} onChange={(event) => setContent(event.target.value)} placeholder="客户关注了什么、表达了哪些需求？" /></label>
        <label>本次结果<input required value={result} onChange={(event) => setResult(event.target.value)} placeholder="例如：已发送材质方案" /></label>
        <div className="form-divider"><span>下一步任务</span></div>
        <label>行动内容<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="例如：邀请客户到店看样" /></label>
        <label>计划时间<input type="datetime-local" value={nextAt} onChange={(event) => setNextAt(event.target.value)} /></label>
        <footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" type="submit">保存跟进</button></footer>
      </form>
    </section>
  </div>
}

export default CustomersPage
