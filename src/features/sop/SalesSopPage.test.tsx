import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { customers, followUps } from '../../data'
import { SalesSopPage } from './SalesSopPage'
import { getManualStorageKey } from './sop-engine'

describe('SalesSopPage', () => {
  beforeEach(() => localStorage.clear())
  it('renders the selected customer stage, guidance and all stages', () => {
    render(<SalesSopPage customers={customers} followUps={followUps} />)
    expect(screen.getByRole('heading', { name:'家具销售 SOP' })).toBeInTheDocument()
    expect(screen.getByText('当前阶段 · 5/7')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name:'报价' })).toBeInTheDocument()
    expect(screen.getByText('七阶段门店成交手册')).toBeInTheDocument()
    expect(screen.getAllByText('定金交付').length).toBeGreaterThan(0)
  })
  it('switches customer and persists manual confirmations', () => {
    render(<SalesSopPage customers={customers} followUps={followUps} />)
    fireEvent.change(screen.getByLabelText('选择客户'), { target:{ value:'c2' } })
    expect(screen.getByText('当前阶段 · 3/7')).toBeInTheDocument()
    const checkbox = screen.getByRole('checkbox', { name:/尺寸、照片与现场限制已归档/ })
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(JSON.parse(localStorage.getItem(getManualStorageKey('c2')) ?? '{}')).toMatchObject({ 'visit-records':true })
  })
  it('shows a useful empty state', () => {
    render(<SalesSopPage customers={[]} followUps={[]} />)
    expect(screen.getByText('录入客户后即可按阶段检查销售动作。')).toBeInTheDocument()
  })
})
