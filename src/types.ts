export type CustomerStage = '新线索' | '已初聊' | '需求确认' | '到店/量房' | '方案设计' | '已报价' | '方案调整' | '已定金' | '生产交付' | '已成交' | '已流失'

export interface FollowUp {
  id: string
  customerId: string
  at: string
  channel: '微信' | '电话' | '到店' | '量房'
  content: string
  result: string
  nextAction?: string
  nextAt?: string
  salesperson: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  source: string
  salesperson: string
  stage: CustomerStage
  intent: '高' | '中' | '低'
  expectedAmount: number
  products: string[]
  style: string
  budget: string
  renovationProgress: string
  concerns: string[]
  lastContactAt: string
  nextFollowUpAt?: string
  createdAt: string
  lostReason?: string
}

