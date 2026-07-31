import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { customers, followUps } from '../../data'
import { CustomersPage } from './CustomersPage'

describe('CustomersPage design collaboration', () => {
  it('creates a designer task while saving a follow-up', () => {
    const onAddDesignTask = vi.fn()
    const onStateChange = vi.fn()
    render(<CustomersPage customers={customers} followUps={followUps} designers={[{ id:'designer-1', name:'陈设计师' }]} onStateChange={onStateChange} onAddDesignTask={onAddDesignTask} />)

    fireEvent.click(screen.getAllByRole('button', { name:'新增跟进' })[0])
    fireEvent.change(screen.getByLabelText('沟通内容'), { target:{ value:'客户需要客厅效果图' } })
    fireEvent.change(screen.getByLabelText('本次结果'), { target:{ value:'安排设计支持' } })
    fireEvent.click(screen.getByLabelText('需要设计师协助'))
    fireEvent.change(screen.getByLabelText('指派设计师 *'), { target:{ value:'designer-1' } })
    fireEvent.change(screen.getByLabelText('任务类型 *'), { target:{ value:'效果图' } })
    fireEvent.change(screen.getByLabelText('计划完成时间 *'), { target:{ value:'2026-08-03T18:00' } })
    fireEvent.change(screen.getByLabelText('设计任务要求 *'), { target:{ value:'按现场尺寸完成客厅效果图' } })
    fireEvent.click(screen.getByRole('button', { name:'保存跟进' }))

    expect(onStateChange).toHaveBeenCalled()
    expect(onAddDesignTask).toHaveBeenCalledWith(expect.objectContaining({ customerId:'c1', designerId:'designer-1', designerName:'陈设计师', type:'效果图', requirement:'按现场尺寸完成客厅效果图', status:'待接收' }))
  })
})
