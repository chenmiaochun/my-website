import { useRef, useState, type FormEvent } from 'react'
import { Download, FileDown, FileUp, Plus, Upload, X } from 'lucide-react'
import type { Customer } from '../../types'
import { CSV_HEADERS, csvRowToCustomer, customerCsv, previewCustomerCsv, templateCsv, type CsvPreviewRow } from './csv'
import './leads.css'

export interface LeadsPageProps { customers: Customer[]; onAddCustomers: (customers: Customer[]) => void }
type FormState = Omit<Customer, 'id' | 'stage' | 'lastContactAt' | 'createdAt' | 'products' | 'concerns' | 'expectedAmount'> & { expectedAmount: string; products: string; concerns: string }
const initialForm: FormState = { name: '', phone: '', source: '', salesperson: '', intent: '中', expectedAmount: '', products: '', style: '', budget: '', renovationProgress: '', concerns: '', nextFollowUpAt: '' }

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
    const customer: Customer = { id: `lead-${now.getTime()}`, name: form.name.trim(), phone: form.phone.trim(), source: form.source.trim(), salesperson: form.salesperson.trim(), stage: '新线索', intent: form.intent, expectedAmount: Number(form.expectedAmount), products: split(form.products), style: form.style.trim(), budget: form.budget.trim(), renovationProgress: form.renovationProgress.trim(), concerns: split(form.concerns), lastContactAt: now.toISOString(), nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : undefined, createdAt: now.toISOString().slice(0, 10) }
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
          <Field label="来源"><input value={form.source} onChange={(e) => update('source', e.target.value)} placeholder="如：小红书" /></Field>
          <Field label="负责人" required><input required value={form.salesperson} onChange={(e) => update('salesperson', e.target.value)} /></Field>
          <Field label="意向"><select value={form.intent} onChange={(e) => update('intent', e.target.value as Customer['intent'])}><option>高</option><option>中</option><option>低</option></select></Field>
          <Field label="预计金额" required><input required min="0" type="number" value={form.expectedAmount} onChange={(e) => update('expectedAmount', e.target.value)} /></Field>
          <Field label="产品"><input value={form.products} onChange={(e) => update('products', e.target.value)} placeholder="多个用 | 分隔" /></Field>
          <Field label="风格"><input value={form.style} onChange={(e) => update('style', e.target.value)} /></Field>
          <Field label="预算"><input value={form.budget} onChange={(e) => update('budget', e.target.value)} /></Field>
          <Field label="装修进度"><input value={form.renovationProgress} onChange={(e) => update('renovationProgress', e.target.value)} /></Field>
          <Field label="关注点"><input value={form.concerns} onChange={(e) => update('concerns', e.target.value)} placeholder="多个用 | 分隔" /></Field>
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
function split(value: string) { return value.split(/[|、；;]/).map((item) => item.trim()).filter(Boolean) }
function download(name: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url) }

export default LeadsPage
