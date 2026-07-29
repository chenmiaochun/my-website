import type { Customer, FollowUp } from '../../types'

export type TaskCategory = 'today' | 'overdue' | 'future' | 'unscheduled'
export type TaskPriority = Customer['intent']

export interface FollowUpTask {
  customer: Customer
  category: TaskCategory
  priority: TaskPriority
  scheduledAt?: string
  nextAction: string
  overdueDays: number
}

function localDayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function localDayNumber(value: Date) {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000
}

export function getTaskCategory(scheduledAt: string | undefined, now: Date): TaskCategory {
  if (!scheduledAt) return 'unscheduled'
  const scheduled = new Date(scheduledAt)
  if (Number.isNaN(scheduled.getTime())) return 'unscheduled'
  const scheduledDay = localDayNumber(scheduled)
  const today = localDayNumber(now)
  if (scheduledDay < today) return 'overdue'
  if (scheduledDay === today) return 'today'
  return 'future'
}

export function getOverdueDays(scheduledAt: string | undefined, now: Date) {
  if (!scheduledAt || getTaskCategory(scheduledAt, now) !== 'overdue') return 0
  return localDayNumber(now) - localDayNumber(new Date(scheduledAt))
}

export function deriveFollowUpTasks(customers: Customer[], followUps: FollowUp[], now: Date = new Date()): FollowUpTask[] {
  const followUpsByCustomer = new Map<string, FollowUp[]>()
  followUps.forEach((item) => {
    const records = followUpsByCustomer.get(item.customerId) ?? []
    records.push(item)
    followUpsByCustomer.set(item.customerId, records)
  })

  return customers.map((customer) => {
    const latestPlanned = (followUpsByCustomer.get(customer.id) ?? [])
      .filter((item) => item.nextAction)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]
    return {
      customer,
      category: getTaskCategory(customer.nextFollowUpAt, now),
      priority: customer.intent,
      scheduledAt: customer.nextFollowUpAt,
      nextAction: latestPlanned?.nextAction ?? (customer.nextFollowUpAt ? '联系客户并推进下一阶段' : '制定首次跟进计划'),
      overdueDays: getOverdueDays(customer.nextFollowUpAt, now),
    }
  }).sort((a, b) => {
    if (!a.scheduledAt) return 1
    if (!b.scheduledAt) return -1
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  })
}

export function groupTasksBySchedule(tasks: FollowUpTask[]) {
  const groups = new Map<string, FollowUpTask[]>()
  tasks.forEach((task) => {
    const key = task.scheduledAt ? localDayKey(new Date(task.scheduledAt)) : 'unscheduled'
    groups.set(key, [...(groups.get(key) ?? []), task])
  })
  return [...groups.entries()].map(([key, items]) => ({ key, tasks: items }))
}
