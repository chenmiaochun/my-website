import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CalendarDays, Check, Clock3, ListTodo, UserRound, X } from 'lucide-react'
import type { Customer, FollowUp } from '../../types'
import { deriveFollowUpTasks, groupTasksBySchedule, type FollowUpTask, type TaskCategory, type TaskPriority } from './task-utils'
import './tasks.css'

export interface TaskCenterPageProps {
  customers: Customer[]
  followUps: FollowUp[]
  onCompleteTask: (followUp: FollowUp) => void
  now?: Date
}

const categories: { id: TaskCategory; label: string }[] = [
  { id: 'today', label: '今日' }, { id: 'overdue', label: '逾期' },
  { id: 'future', label: '未来' }, { id: 'unscheduled', label: '无计划' },
]

const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

function localInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function groupTitle(key: string, now: Date) {
  if (key === 'unscheduled') return '待制定计划'
  const value = new Date(`${key}T12:00:00`)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return key === today ? '今天' : new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(value)
}

export function TaskCenterPage({ customers, followUps, onCompleteTask, now = new Date() }: TaskCenterPageProps) {
  const [category, setCategory] = useState<TaskCategory>('today')
  const [owner, setOwner] = useState('全部')
  const [priority, setPriority] = useState<TaskPriority | '全部'>('全部')
  const [activeTask, setActiveTask] = useState<FollowUpTask | null>(null)
  const tasks = useMemo(() => deriveFollowUpTasks(customers, followUps, now), [customers, followUps, now])
  const owners = useMemo(() => [...new Set(customers.map((item) => item.salesperson))], [customers])
  const counts = useMemo(() => Object.fromEntries(categories.map(({ id }) => [id, tasks.filter((task) => task.category === id).length])) as Record<TaskCategory, number>, [tasks])
  const visible = tasks.filter((task) => task.category === category && (owner === '全部' || task.customer.salesperson === owner) && (priority === '全部' || task.priority === priority))
  const groups = groupTasksBySchedule(visible)

  return <section className="task-center" aria-label="跟进任务中心">
    <header className="task-header">
      <div><p>销售执行</p><h1>跟进任务中心</h1><span>{tasks.length} 位客户需要持续推进</span></div>
      <div className="task-header-stat"><ListTodo size={20} /><strong>{counts.today + counts.overdue}</strong><span>今日待处理</span></div>
    </header>

    <nav className="task-tabs" aria-label="任务分类">
      {categories.map((item) => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}><span>{item.label}</span><b>{counts[item.id]}</b></button>)}
    </nav>

    <div className="task-toolbar">
      <div><label>销售人员<select aria-label="销售人员" value={owner} onChange={(event) => setOwner(event.target.value)}><option>全部</option>{owners.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>优先级<select aria-label="优先级" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | '全部')}><option>全部</option><option value="高">高优先</option><option value="中">中优先</option><option value="低">低优先</option></select></label></div>
      <span>共 {visible.length} 项</span>
    </div>

    <main className="task-schedule">
      {groups.map((group) => <section className="schedule-group" key={group.key}>
        <header><CalendarDays size={17} /><h2>{groupTitle(group.key, now)}</h2><span>{group.tasks.length} 项</span></header>
        <div className="task-list">{group.tasks.map((task) => <TaskRow key={task.customer.id} task={task} onComplete={() => setActiveTask(task)} />)}</div>
      </section>)}
      {!groups.length && <div className="task-empty"><Check size={28} /><strong>当前没有任务</strong><span>调整筛选条件查看其他安排</span></div>}
    </main>
    {activeTask && <CompleteDialog task={activeTask} now={now} onClose={() => setActiveTask(null)} onSubmit={(record) => { onCompleteTask(record); setActiveTask(null) }} />}
  </section>
}

function TaskRow({ task, onComplete }: { task: FollowUpTask; onComplete: () => void }) {
  const { customer } = task
  return <article className={`task-row priority-${task.priority}`}>
    <div className="task-time">{task.scheduledAt ? <><Clock3 size={15} /><strong>{new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(task.scheduledAt))}</strong></> : <><UserRound size={15} /><strong>待安排</strong></>}</div>
    <div className="task-main"><div className="task-title"><h3>{customer.name}</h3><span>{customer.stage}</span><i>{task.priority}优先</i></div><p>{task.nextAction}</p><div className="task-meta"><span>负责人 {customer.salesperson}</span><span>预计成交 {money.format(customer.expectedAmount)}</span>{task.scheduledAt && <span>{dateTime.format(new Date(task.scheduledAt))}</span>}</div></div>
    {task.overdueDays > 0 && <div className="overdue-mark"><AlertTriangle size={15} />超期 {task.overdueDays} 天</div>}
    <button className="complete-button" onClick={onComplete}><Check size={17} />完成跟进</button>
  </article>
}

function CompleteDialog({ task, now, onClose, onSubmit }: { task: FollowUpTask; now: Date; onClose: () => void; onSubmit: (record: FollowUp) => void }) {
  const [channel, setChannel] = useState<FollowUp['channel']>('微信')
  const [content, setContent] = useState('')
  const [result, setResult] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextAt, setNextAt] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit({ id: `task-followup-${now.getTime()}-${task.customer.id}`, customerId: task.customer.id, salesperson: task.customer.salesperson, at: now.toISOString(), channel, content: content.trim(), result: result.trim(), nextAction: nextAction.trim() || undefined, nextAt: nextAt ? new Date(nextAt).toISOString() : undefined })
  }
  return <div className="task-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="task-dialog" role="dialog" aria-modal="true" aria-labelledby="complete-task-title"><header><div><p>记录沟通结果</p><h2 id="complete-task-title">完成跟进 · {task.customer.name}</h2></div><button type="button" aria-label="关闭" onClick={onClose}><X size={20} /></button></header>
      <form onSubmit={submit}><fieldset><legend>沟通渠道</legend><div className="channel-picker">{(['微信', '电话', '到店', '量房'] as FollowUp['channel'][]).map((item) => <label key={item}><input type="radio" name="channel" checked={channel === item} onChange={() => setChannel(item)} /><span>{item}</span></label>)}</div></fieldset>
        <label>沟通内容<textarea required rows={3} value={content} onChange={(event) => setContent(event.target.value)} placeholder="记录客户反馈与关键需求" /></label>
        <label>跟进结果<input required value={result} onChange={(event) => setResult(event.target.value)} placeholder="本次沟通取得了什么结果" /></label>
        <div className="next-fields"><label>下次动作<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="例如：发送调整方案" /></label><label>下次时间<input type="datetime-local" min={localInput(now)} value={nextAt} onChange={(event) => setNextAt(event.target.value)} /></label></div>
        <footer><button type="button" className="cancel-button" onClick={onClose}>取消</button><button type="submit" className="save-button"><Check size={17} />确认完成</button></footer>
      </form>
    </section>
  </div>
}

export default TaskCenterPage
