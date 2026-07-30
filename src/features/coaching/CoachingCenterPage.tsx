import { useMemo, useState } from 'react'
import { AlertTriangle, Award, BookOpenCheck, CheckCircle2, ClipboardList, Target, Users } from 'lucide-react'
import type { Customer, FollowUp } from '../../types'
import { buildCoachingReport, formatCoachingMoney, type RateMetric, type SalespersonCoaching } from './coaching'
import './coaching.css'

export interface CoachingCenterPageProps { customers: Customer[]; followUps: FollowUp[]; now?: Date }

export function CoachingCenterPage({ customers, followUps, now = new Date() }: CoachingCenterPageProps) {
  const report = useMemo(() => buildCoachingReport(customers, followUps, now), [customers, followUps, now])
  const [selected, setSelected] = useState('团队总览')
  const current = selected === '团队总览' ? report.team : report.members.find((item) => item.salesperson === selected) ?? report.team

  return <main className="coaching-center" aria-labelledby="coaching-title">
    <header className="coaching-hero"><div><p>销售辅导中心</p><h1 id="coaching-title">让每次复盘都有数据依据</h1><span>基于最近 {report.windowDays} 天跟进行为，定位动作差距与训练重点</span></div><div className="coach-date">统计截至<br/><strong>{new Intl.DateTimeFormat('zh-CN', { month:'long', day:'numeric' }).format(now)}</strong></div></header>
    {!customers.length && !followUps.length ? <section className="coach-empty"><Users/><h2>暂无可分析数据</h2><p>录入客户与跟进记录后，可查看团队表现、案例复盘和训练任务。</p></section> : <>
      <nav className="coach-tabs" aria-label="查看范围"><button type="button" aria-pressed={selected === '团队总览'} onClick={() => setSelected('团队总览')}><Users/>团队总览</button>{report.members.map((member) => <button type="button" key={member.salesperson} aria-pressed={selected === member.salesperson} onClick={() => setSelected(member.salesperson)}>{member.salesperson}<span>{member.score}分</span></button>)}</nav>
      {selected === '团队总览' && <TeamTable members={report.members} onSelect={setSelected}/>}<Detail person={current}/>
    </>}
  </main>
}

function TeamTable({ members, onSelect }: { members: SalespersonCoaching[]; onSelect: (name: string) => void }) {
  return <section className="coach-section team-board"><header><div><h2>团队表现</h2><p>同一口径横向比较，点击成员进入辅导详情</p></div></header>{members.length ? <div className="team-table" role="table"><div className="team-row team-head" role="row"><span>销售</span><span>综合分</span><span>及时跟进</span><span>阶段健康</span><span>风险客户</span><span>商机金额</span></div>{members.map((item) => <button type="button" className="team-row" role="row" key={item.salesperson} onClick={() => onSelect(item.salesperson)}><strong>{item.salesperson}{item.lowData && <small>数据较少</small>}</strong><b>{item.score}</b><span>{item.timelyRate.value}%</span><span>{item.stageHealthRate.value}%</span><span className={item.riskCustomerCount ? 'risk-text' : ''}>{item.riskCustomerCount}</span><span>¥{formatCoachingMoney(item.opportunityAmount)}</span></button>)}</div> : <p className="coach-mini-empty">暂无销售人员数据</p>}</section>
}

function Detail({ person }: { person: SalespersonCoaching }) {
  return <div className="coach-detail">
    <section className="score-panel"><div className="score-ring" style={{ '--score': `${person.score * 3.6}deg` } as React.CSSProperties}><span><strong>{person.score}</strong>分</span></div><div><p>{person.salesperson}</p><h2>辅导诊断</h2><span>{person.customerCount} 个客户 · 近7天 {person.followUpCount} 条记录 · ¥{formatCoachingMoney(person.opportunityAmount)} 在跟商机</span>{person.lowData && <div className="low-data"><AlertTriangle/>当前样本少于3个客户或3条记录，结果仅作方向参考。</div>}</div></section>
    <section className="metrics-grid" aria-label="评分依据"><Metric title="及时跟进率" metric={person.timelyRate}/><Metric title="有效记录率" metric={person.effectiveRecordRate}/><Metric title="下一步计划率" metric={person.nextPlanRate}/><Metric title="阶段推进健康度" metric={person.stageHealthRate}/></section>
    <section className="formula"><Target/><div><strong>综合分计算依据</strong><p>{person.scoreExplanation}</p></div></section>
    <div className="case-grid"><CaseList title="优秀案例" icon={<Award/>} empty="样本中暂无完整优秀案例" cases={person.excellentCases}/><CaseList title="需复盘案例" icon={<AlertTriangle/>} empty="当前没有明显风险案例" cases={person.reviewCases}/></div>
    <div className="action-grid"><ActionList title="具体辅导建议" icon={<BookOpenCheck/>} items={person.suggestions}/><ActionList title="本周训练任务" icon={<ClipboardList/>} items={person.trainingTasks} ordered/></div>
  </div>
}

function Metric({ title, metric }: { title: string; metric: RateMetric }) { return <article className="metric-card"><div><span>{title}</span><strong>{metric.value}%</strong></div><i><em style={{ width: `${metric.value}%` }}/></i><p>{metric.numerator} / {metric.denominator}</p><small>{metric.explanation}</small></article> }
function CaseList({ title, icon, empty, cases }: { title: string; icon: React.ReactNode; empty: string; cases: SalespersonCoaching['excellentCases'] }) { return <section className="coach-section case-list"><header>{icon}<h2>{title}</h2></header>{cases.length ? cases.map((item) => <article key={item.customerId}><div><strong>{item.customerName}</strong><span>{item.stage}</span></div><b>¥{formatCoachingMoney(item.amount)}</b><p>{item.reason}</p></article>) : <p className="coach-mini-empty"><CheckCircle2/>{empty}</p>}</section> }
function ActionList({ title, icon, items, ordered = false }: { title: string; icon: React.ReactNode; items: string[]; ordered?: boolean }) { return <section className="coach-section action-list"><header>{icon}<h2>{title}</h2></header>{items.map((item, index) => <div key={item}><span>{ordered ? index + 1 : '·'}</span><p>{item}</p></div>)}</section> }

export default CoachingCenterPage
