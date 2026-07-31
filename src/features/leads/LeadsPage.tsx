import { useRef, useState, type FormEvent } from 'react'
import { Download, FileDown, FileUp, Plus, Upload, X } from 'lucide-react'
import type { Customer } from '../../types'
import { CSV_HEADERS, csvRowToCustomer, customerCsv, previewCustomerCsv, templateCsv, type CsvPreviewRow } from './csv'
import './leads.css'

export interface LeadsPageProps { customers: Customer[]; onAddCustomers: (customers: Customer[]) => void }
type FormState = { name: string; phone: string; source: string; salesperson: string; intent: Customer['intent']; products: string[]; style: string; budget: string; renovationProgress: string; concerns: string[]; cityArea: string; visitPeriod: string; nextFollowUpAt: string }
const initialForm: FormState = { name: '', phone: '', source: '', salesperson: '', intent: '中', products: [], style: '', budget: '', renovationProgress: '', concerns: [], cityArea: '', visitPeriod: '', nextFollowUpAt: '' }
const SOURCES = ['自然到店', '老客转介绍', '抖音', '视频号', '小红书', '大众点评', '其他']
const CITY_AREAS = ['揭阳', '汕头', '潮州', '汕尾', '深圳', '其他地区']
const VISIT_PERIODS = ['上午', '中午', '下午', '晚上', '未到店']
const PRODUCTS = ['沙发', '茶台/茶桌', '餐桌椅', '床', '柜类', '全屋家具', '软装饰品']
const STYLES = ['现代原木', '意式极简', '现代轻奢', '中古', '奶油风', '新中式', '暂未确定']
const BUDGETS = ['3万以内', '3-5万', '5-8万', '8-12万', '12-20万', '20万以上', '暂未确定']
const BUDGET_AMOUNTS: Record<string, number> = { '3万以内': 30000, '3-5万': 50000, '5-8万': 80000, '8-12万': 120000, '12-20万': 200000, '20万以上': 250000, '暂未确定': 0 }
const RENOVATION_PROGRESS = ['毛坯/未开工', '水电施工', '木工/泥工', '油漆阶段', '硬装收尾', '软装进场', '已入住', '未交房/时间未定']
const CONCERNS = ['价格预算', '款式风格', '尺寸方案', '材质环保', '交付时间', '售后保障', '家人意见']

export function LeadsPage({ customers, onAddCustomers }: LeadsPageProps) {
  const [form, setForm] = useState(initialForm)
  const [preview, setPreview] = useState<CsvPreviewRow[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const validRows = preview.filter((row) => row.errors.length === 0)
  const salespersonOptions = [...new Set(customers.map((customer) => customer.salesperson).filter(Boolean))]

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })) }
  function submit(event: FormEvent) {
    event.preventDefault()
    const now = new Date()
    const customer: Customer = { id: `lead-${now.getTime()}`, name: form.name.trim(), phone: form.phone.trim(), source: form.source, salesperson: form.salesperson, stage: '新线索', intent: form.intent, expectedAmount: BUDGET_AMOUNTS[form.budget] ?? 0, products: form.products, style: form.style, budget: form.budget, renovationProgress: form.renovationProgress, concerns: form.concerns, cityArea: form.cityArea, visitPeriod: form.visitPeriod, lastContactAt: now.toISOString(), nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : undefined, createdAt: now.toISOString().slice(0, 10) }
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
          <Field label="姓名" required><input required value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
          <Field label="电话" required><input required type="tel" pattern="[+0-9][0-9 -]{5,19}" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></Field>
          <Field label="认知途径" required><ChoiceSelect required value={form.source} options={SOURCES} placeholder="请选择客户来源" onChange={(value) => update('source', value)} /></Field>
          <Field label="所在城市" required><ChoiceSelect required value={form.cityArea} options={CITY_AREAS} placeholder="请选择城市" onChange={(value) => update('cityArea', value)} /></Field>
          <Field label="到店时段"><ChoiceSelect value={form.visitPeriod} options={VISIT_PERIODS} placeholder="请选择" onChange={(value) => update('visitPeriod', value)} /></Field>
          <Field label="负责人" required><ChoiceSelect required value={form.salesperson} options={salespersonOptions} placeholder="请选择销售" onChange={(value) => update('salesperson', value)} /></Field>
          <Field label="客户意向"><ChoiceSelect value={form.intent} options={['高', '中', '低']} onChange={(value) => update('intent', value as Customer['intent'])} /></Field>
          <Field label="预算范围" required><ChoiceSelect required value={form.budget} options={BUDGETS} placeholder="请选择预算" onChange={(value) => update('budget', value)} /></Field>
          <Field label="偏好风格"><ChoiceSelect value={form.style} options={STYLES} placeholder="请选择风格" onChange={(value) => update('style', value)} /></Field>
          <Field label="装修进度" required><ChoiceSelect required value={form.renovationProgress} options={RENOVATION_PROGRESS} placeholder="请选择进度" onChange={(value) => update('renovationProgress', value)} /></Field>
          <ChoiceGroup label="核心需求（可多选）" options={PRODUCTS} values={form.products} onChange={(values) => update('products', values)} />
          <ChoiceGroup label="重点关注（可多选）" options={CONCERNS} values={form.concerns} onChange={(values) => update('concerns', values)} />
          <Field label="下次跟进"><input type="datetime-local" value={form.nextFollowUpAt} onChange={(e) => update('nextFollowUpAt', e.target.value)} /></Field>
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label><span>{label}{required && <b> *</b>}</span>{children}</label> }
function ChoiceSelect({ value, options, placeholder, required, onChange }: { value: string; options: string[]; placeholder?: string; required?: boolean; onChange: (value: string) => void }) { return <select required={required} value={value} onChange={(event) => onChange(event.target.value)}>{placeholder && <option value="">{placeholder}</option>}{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> }
function ChoiceGroup({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (values: string[]) => void }) { return <fieldset className="choice-group"><legend>{label}</legend><div>{options.map((option) => <label className={values.includes(option) ? 'selected' : ''} key={option}><input type="checkbox" checked={values.includes(option)} onChange={() => onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option])} /><span>{option}</span></label>)}</div></fieldset> }
function download(name: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url) }

export default LeadsPage
