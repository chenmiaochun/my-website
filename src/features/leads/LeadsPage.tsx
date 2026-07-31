import { useRef, useState, type FormEvent } from 'react'
import { ChevronDown, Download, FileDown, FileUp, Plus, Upload, X } from 'lucide-react'
import type { Customer } from '../../types'
import { CSV_HEADERS, csvRowToCustomer, customerCsv, previewCustomerCsv, templateCsv, type CsvPreviewRow } from './csv'
import './leads.css'

export interface LeadsPageProps { customers: Customer[]; onAddCustomers: (customers: Customer[]) => void }
type FormState = { name: string; phone: string; source: string; salesperson: string; products: string[]; budget: string; renovationProgress: string; cityArea: string; vehicleBrand: string; customerStatus: string; nextFollowUpAt: string; notes: string }
const initialForm: FormState = { name: '', phone: '', source: '', salesperson: '', products: [], budget: '', renovationProgress: '', cityArea: '', vehicleBrand: '', customerStatus: '', nextFollowUpAt: '', notes: '' }
const SOURCES = ['抖音', '小红书', '视频号', '门店自然到店', '老客户转介绍', '设计师推荐', '异业合作', '其他']
const CITY_AREAS = ['揭阳', '汕头', '深圳', '潮州', '其他']
const SALESPEOPLE = ['陈婉珊', '吴漫东', '郭予旭', '其他']
const PRODUCTS = ['沙发', '茶台', '餐桌', '床', '全屋定制', '其他']
const BUDGETS = ['2 万以下', '2-5 万', '5-8 万', '8-15 万', '15 万以上']
const BUDGET_AMOUNTS: Record<string, number> = { '2 万以下': 20000, '2-5 万': 50000, '5-8 万': 80000, '8-15 万': 150000, '15 万以上': 200000 }
const RENOVATION_PROGRESS = ['未开工', '硬装中', '硬装完成', '已入住补购', '未交房']
const CUSTOMER_STATUS = ['首次到店', '持续跟进', '已成交', '已流失']
const STATUS_STAGE: Record<string, Customer['stage']> = { '首次到店': '到店/量房', '持续跟进': '需求确认', '已成交': '已成交', '已流失': '已流失' }
const VEHICLE_BRANDS = ['比亚迪', '特斯拉', '宝马', '丰田', '其他']

export function LeadsPage({ customers, onAddCustomers }: LeadsPageProps) {
  const [form, setForm] = useState(initialForm)
  const [preview, setPreview] = useState<CsvPreviewRow[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const validRows = preview.filter((row) => row.errors.length === 0)
  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })) }
  function submit(event: FormEvent) {
    event.preventDefault()
    const now = new Date()
    const customer: Customer = { id: `lead-${now.getTime()}`, name: form.name.trim(), phone: form.phone.trim(), source: form.source, salesperson: form.salesperson, stage: STATUS_STAGE[form.customerStatus] ?? '新线索', intent: form.customerStatus === '已成交' ? '高' : '中', expectedAmount: BUDGET_AMOUNTS[form.budget] ?? 0, products: form.products, style: '', budget: form.budget, renovationProgress: form.renovationProgress, concerns: [], cityArea: form.cityArea, vehicleBrand: form.vehicleBrand, notes: form.notes.trim(), lastContactAt: now.toISOString(), nextFollowUpAt: form.nextFollowUpAt ? new Date(`${form.nextFollowUpAt}T09:00:00`).toISOString() : undefined, createdAt: now.toISOString().slice(0, 10) }
    onAddCustomers([customer]); setForm(initialForm); setNotice(`已新增客户：${customer.name}`)
  }
  async function selectFile(file?: File) {
    if (!file) return
    const result = previewCustomerCsv(await file.text())
    setFileName(file.name); setPreview(result.rows); setFileErrors(result.fileErrors); setNotice('')
  }
  function confirmImport() {
    if (!validRows.length || preview.some((row) => row.errors.length)) return
    onAddCustomers(validRows.map((row) => csvRowToCustomer(row)))
    setNotice(`已导入 ${validRows.length} 位客户`); clearPreview()
  }
  function clearPreview() { setPreview([]); setFileErrors([]); setFileName(''); if (fileInput.current) fileInput.current.value = '' }

  return <section className="leads-page" aria-label="线索数据中心">
    <header className="leads-header">
      <div><p>客户经营</p><h1>线索数据中心</h1><span>统一录入、校验和导出客户资料</span></div>
      <div className="leads-actions">
        <button type="button" className="secondary" onClick={() => download('客户导入模板.csv', templateCsv())}><FileDown size={17} />下载模板</button>
        <button type="button" className="secondary" onClick={() => download('客户数据.csv', customerCsv(customers))}><Download size={17} />导出客户</button>
      </div>
    </header>
    {notice && <div className="leads-notice" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}><X size={15} /></button></div>}
    <main className="leads-layout">
      <section className="leads-panel">
        <div className="panel-heading"><Plus size={19} /><div><h2>新增客户</h2><p>建立一条可立即跟进的新线索</p></div></div>
        <form className="lead-form" onSubmit={submit}>
          <div className="form-section-title"><strong>基础信息</strong><span>客户身份与归属</span></div>
          <Field label="姓名" required><input required value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
          <Field label="电话" required><input required type="tel" pattern="[+0-9][0-9 -]{5,19}" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></Field>
          <Field label="所在城市"><ChoiceSelect value={form.cityArea} options={CITY_AREAS} placeholder="请选择城市" onChange={(value) => update('cityArea', value)} /></Field>
          <Field label="负责人" required><ChoiceSelect required value={form.salesperson} options={SALESPEOPLE} placeholder="请选择负责人" onChange={(value) => update('salesperson', value)} /></Field>
          <div className="form-section-title"><strong>业务信息</strong><span>跟进判断与客户需求</span></div>
          <Field label="预算范围" required><ChoiceSelect required value={form.budget} options={BUDGETS} placeholder="请选择预算" onChange={(value) => update('budget', value)} /></Field>
          <ProductSelect values={form.products} onChange={(values) => update('products', values)} />
          <Field label="客户来源"><ChoiceSelect value={form.source} options={SOURCES} placeholder="请选择客户来源" onChange={(value) => update('source', value)} /></Field>
          <Field label="客户状态"><ChoiceSelect value={form.customerStatus} options={CUSTOMER_STATUS} placeholder="请选择客户状态" onChange={(value) => update('customerStatus', value)} /></Field>
          <Field label="装修进度"><ChoiceSelect value={form.renovationProgress} options={RENOVATION_PROGRESS} placeholder="请选择装修进度" onChange={(value) => update('renovationProgress', value)} /></Field>
          <Field label="下次跟进时间"><input type="date" value={form.nextFollowUpAt} onChange={(e) => update('nextFollowUpAt', e.target.value)} /></Field>
          <Field label="车辆品牌"><ChoiceSelect value={form.vehicleBrand} options={VEHICLE_BRANDS} placeholder="请选择车辆品牌" onChange={(value) => update('vehicleBrand', value)} /></Field>
          <Field label="备注" className="full-width"><textarea rows={2} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="可填写客户特殊需求、到店细节等补充信息" /></Field>
          <button className="primary form-submit" type="submit"><Plus size={17} />新增客户</button>
        </form>
      </section>
      <section className="leads-panel import-panel">
        <div className="panel-heading"><Upload size={19} /><div><h2>批量导入</h2><p>上传 CSV 后先校验，再确认写入</p></div></div>
        <input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={(e) => void selectFile(e.target.files?.[0])} />
        {!fileName ? <button className="drop-zone" type="button" onClick={() => fileInput.current?.click()}><FileUp size={28} /><strong>选择 CSV 文件</strong><span>支持 UTF-8 编码和中文字段</span></button> : <>
          <div className="file-bar"><span><FileUp size={17} />{fileName}</span><button type="button" onClick={clearPreview} aria-label="移除文件"><X size={17} /></button></div>
          {fileErrors.map((error) => <p className="file-error" role="alert" key={error}>{error}</p>)}
          {preview.length > 0 && <div className="preview-summary"><span>共 {preview.length} 行</span><span className="valid">有效 {validRows.length}</span><span className={preview.length === validRows.length ? '' : 'invalid'}>错误 {preview.length - validRows.length}</span></div>}
          {preview.length > 0 && <div className="table-wrap"><table><thead><tr><th>行</th>{CSV_HEADERS.slice(0, 6).map((header) => <th key={header}>{header}</th>)}<th>校验结果</th></tr></thead><tbody>{preview.map((row) => <tr className={row.errors.length ? 'has-error' : ''} key={row.line}><td>{row.line}</td>{CSV_HEADERS.slice(0, 6).map((header) => <td key={header}>{row.values[header] || '-'}</td>)}<td>{row.errors.length ? row.errors.join('；') : '通过'}</td></tr>)}</tbody></table></div>}
          <button type="button" className="primary confirm-import" disabled={!validRows.length || preview.some((row) => row.errors.length > 0)} onClick={confirmImport}>确认导入 {validRows.length ? `${validRows.length} 条` : ''}</button>
        </>}
      </section>
    </main>
  </section>
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) { return <label className={className}><span>{label}{required && <b> *</b>}</span>{children}</label> }
function ChoiceSelect({ value, options, placeholder, required, onChange }: { value: string; options: string[]; placeholder?: string; required?: boolean; onChange: (value: string) => void }) { return <select required={required} value={value} onChange={(event) => onChange(event.target.value)}>{placeholder && <option value="">{placeholder}</option>}{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> }
function ProductSelect({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) { return <label className="product-field"><span>意向产品</span><details className="product-select"><summary>{values.length ? values.join(' | ') : '请选择意向产品'}<ChevronDown size={15} /></summary><div>{PRODUCTS.map((option) => <label key={option}><input type="checkbox" checked={values.includes(option)} onChange={() => onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option])} />{option}</label>)}</div></details></label> }
function download(name: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url) }

export default LeadsPage
