import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, ChevronRight, ClipboardCheck, MessageSquareQuote, ShieldAlert, Sparkles } from 'lucide-react'
import type { Customer, FollowUp } from '../../types'
import { evaluateSalesSop, getManualStorageKey, type ManualConfirmations, type SopItemKind } from './sop-engine'
import './sop.css'

export interface SalesSopPageProps { customers: Customer[]; followUps: FollowUp[] }

const sectionLabels: Record<SopItemKind, string> = { question: '必问信息', action: '必做动作', condition: '通过条件' }

function loadManual(customerId: string): ManualConfirmations {
  try { return JSON.parse(localStorage.getItem(getManualStorageKey(customerId)) ?? '{}') as ManualConfirmations } catch { return {} }
}

export function SalesSopPage({ customers, followUps }: SalesSopPageProps) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [manual, setManual] = useState<ManualConfirmations>(() => customerId ? loadManual(customerId) : {})
  const customer = customers.find((item) => item.id === customerId) ?? customers[0]

  useEffect(() => { if (customer && customer.id !== customerId) setCustomerId(customer.id) }, [customer, customerId])
  useEffect(() => { setManual(customer ? loadManual(customer.id) : {}) }, [customer?.id])
  const evaluation = useMemo(() => customer ? evaluateSalesSop(customer, followUps, manual) : null, [customer, followUps, manual])

  function toggle(itemId: string) {
    if (!customer) return
    setManual((current) => {
      const next = { ...current, [itemId]: !current[itemId] }
      if (!next[itemId]) delete next[itemId]
      localStorage.setItem(getManualStorageKey(customer.id), JSON.stringify(next))
      return next
    })
  }

  if (!customer || !evaluation) return <section className="sales-sop sop-empty"><ClipboardCheck size={32} /><h1>家具销售 SOP</h1><p>录入客户后即可按阶段检查销售动作。</p></section>

  const current = evaluation.currentStage
  return <section className="sales-sop" aria-label="家具销售 SOP">
    <header className="sop-hero">
      <div><p className="sop-eyebrow">尚品居 · 门店成交作业台</p><h1>家具销售 SOP</h1><span>把每一次跟进变成清晰、可复盘的成交动作</span></div>
      <label className="sop-customer-picker">当前客户<select aria-label="选择客户" value={customer.id} onChange={(event) => setCustomerId(event.target.value)}>{customers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stage}</option>)}</select></label>
    </header>

    <nav className="sop-stage-track" aria-label="销售阶段">
      {evaluation.stages.map((stage, index) => <div key={stage.id} className={`sop-stage-node ${stage.status}`} aria-current={stage.status === 'current' ? 'step' : undefined}>
        <span>{stage.status === 'completed' ? <Check size={15} /> : index + 1}</span><div><b>{stage.name}</b><small>{stage.completedCount}/{stage.items.length}</small></div>{index < evaluation.stages.length - 1 && <ChevronRight size={15} />}
      </div>)}
    </nav>

    <div className="sop-summary-grid">
      <article className="sop-customer-summary"><div><span>当前客户</span><strong>{customer.name}</strong><small>{customer.salesperson} 负责 · {customer.intent}意向</small></div><dl><div><dt>意向品类</dt><dd>{customer.products.join('、') || '待确认'}</dd></div><div><dt>预算</dt><dd>{customer.budget || '待确认'}</dd></div><div><dt>风格</dt><dd>{customer.style || '待确认'}</dd></div></dl></article>
      <article className={`sop-readiness ${evaluation.readyForNextStage ? 'ready' : ''}`}><div className="sop-readiness-icon">{evaluation.readyForNextStage ? <CheckCircle2 /> : <AlertTriangle />}</div><div><span>阶段判断</span><strong>{evaluation.readyForNextStage ? '已具备推进条件' : `还缺 ${evaluation.missingItems.length} 项`}</strong><p>{evaluation.readyForNextStage ? (evaluation.nextStage ? `可以进入「${evaluation.nextStage.name}」` : '进入生产与交付跟进') : `完成下方清单后再推进至「${evaluation.nextStage?.name ?? '交付'}」`}</p></div></article>
    </div>

    <div className="sop-workspace">
      <main className="sop-main">
        <header className="sop-stage-header"><div><p>当前阶段 · {evaluation.currentStageIndex + 1}/7</p><h2>{current.name}</h2><span>{current.summary}</span></div><div className="sop-progress"><strong>{Math.round(current.completedCount / current.items.length * 100)}%</strong><span>本阶段完成度</span></div></header>
        <section className="sop-checklist" aria-label={`${current.name}检查清单`}>
          {(['question', 'action', 'condition'] as SopItemKind[]).map((kind) => <div className="sop-check-group" key={kind}><h3>{sectionLabels[kind]}</h3>{current.items.filter((x) => x.kind === kind).map((check) => <label className={check.completed ? 'checked' : ''} key={check.id}><input type="checkbox" checked={check.completed} disabled={check.source === 'stage' || check.source === 'data'} onChange={() => toggle(check.id)} /><span className="check-mark"><Check size={14} /></span><span>{check.label}<small>{check.source === 'data' ? '客户资料/跟进记录已识别' : check.source === 'manual' ? '人工确认' : '待完成，可人工确认'}</small></span></label>)}</div>)}
        </section>
        <div className="sop-reference-grid">
          <section><h3><ShieldAlert size={17} />常见风险</h3><ul>{current.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul></section>
          <section className="sop-script"><h3><MessageSquareQuote size={17} />推荐话术</h3><blockquote>{current.script}</blockquote></section>
        </div>
      </main>

      <aside className="sop-action-panel"><header><Sparkles size={18} /><div><h2>下一步行动</h2><span>根据现有资料实时生成</span></div></header><ol>{evaluation.actions.map((action, index) => <li key={action}><span>{index + 1}</span><p>{action}</p></li>)}</ol><div className="sop-evidence"><h3>判断依据</h3><p>客户阶段：{customer.stage}</p><p>有效跟进：{followUps.filter((x) => x.customerId === customer.id).length} 条</p><p>人工确认：{Object.values(manual).filter(Boolean).length} 项</p></div></aside>
    </div>

    <section className="sop-playbook"><header><div><p>全流程参考</p><h2>七阶段门店成交手册</h2></div><span>展开查看每一阶段的标准动作</span></header><div className="sop-playbook-list">{evaluation.stages.map((stage, index) => <details key={stage.id} open={stage.status === 'current'}><summary><span>{index + 1}</span><div><strong>{stage.name}</strong><small>{stage.summary}</small></div><b>{stage.status === 'completed' ? '已完成' : stage.status === 'current' ? '进行中' : '待推进'}</b></summary><div className="sop-detail-body"><section><h3>必问信息</h3><ul>{stage.questions.map((x) => <li key={x}>{x}</li>)}</ul></section><section><h3>必做动作</h3><ul>{stage.actions.map((x) => <li key={x}>{x}</li>)}</ul></section><section><h3>通过条件</h3><ul>{stage.conditions.map((x) => <li key={x}>{x}</li>)}</ul></section><section><h3>常见风险</h3><ul>{stage.risks.map((x) => <li key={x}>{x}</li>)}</ul></section><section className="wide"><h3>推荐话术</h3><p>{stage.script}</p></section></div></details>)}</div></section>
  </section>
}

export default SalesSopPage
