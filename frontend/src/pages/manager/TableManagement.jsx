import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import api, { errorMessage } from '../../api/axiosClient'
import '../../styles/table-management.css'

const labels = { AVAILABLE: 'Trống', OCCUPIED: 'Có khách', UNAVAILABLE: 'Tạm ngưng' }
const originKey = 'cafe.tableQrOrigin'
function initialOrigin() {
  try { return localStorage.getItem(originKey) || window.location.origin } catch { return window.location.origin }
}
export default function TableManagement() {
  const [tables, setTables] = useState([])
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [availability, setAvailability] = useState(null)
  const [availabilityError, setAvailabilityError] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState([])
  const [printing, setPrinting] = useState(null)
  const [origin, setOrigin] = useState(initialOrigin)
  const [originDraft, setOriginDraft] = useState(initialOrigin)
  const [originError, setOriginError] = useState('')
  useEffect(() => {
    let live = true
    async function load() {
      try {
        const r = await api.get('/manager/tables')
        if (live) { setTables(r.data); setError('') }
      } catch (e) { if (live) setError(errorMessage(e)) }
      finally { if (live) setLoading(false) }
    }
    load(); const timer = setInterval(load, 10000)
    return () => { live = false; clearInterval(timer) }
  }, [])
  useEffect(() => {
    const close = e => { if (e.key === 'Escape' && !busy) { setEditing(null); setPrinting(null); setAvailability(null); setDetailId(null) } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [busy])
  async function save(e) {
    e.preventDefault(); setBusy(true); setFormError('')
    try {
      const body = { tableNumber: editing.tableNumber.trim(), active: editing.active }
      const r = editing.id ? await api.put(`/manager/tables/${editing.id}`, body) : await api.post('/manager/tables', body)
      setTables(current => [...current.filter(t => t.id !== r.data.id), r.data])
      setDetailId(r.data.id); setEditing(null)
    } catch (e) { setFormError(errorMessage(e)) }
    finally { setBusy(false) }
  }
  async function changeAvailability() {
    setBusy(true); setAvailabilityError('')
    try {
      const r = await api.put(`/manager/tables/${availability.id}`, {
        tableNumber: availability.tableNumber, active: !availability.active,
      })
      setTables(current => current.map(t => t.id === r.data.id ? r.data : t))
      setAvailability(null)
    } catch (e) { setAvailabilityError(errorMessage(e)) }
    finally { setBusy(false) }
  }
  function saveOrigin(e) {
    e.preventDefault()
    try {
      const url = new URL(originDraft.trim())
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error()
      setOrigin(url.origin); setOriginDraft(url.origin); setOriginError('')
      try { localStorage.setItem(originKey, url.origin) } catch { /* Vẫn dùng địa chỉ trong lần mở trang này. */ }
    } catch { setOriginError('Nhập địa chỉ gốc hợp lệ, ví dụ https://cafe.vn hoặc http://192.168.1.10:5174.') }
  }
  function qrUrl(t) { return `${origin}/menu?table=${encodeURIComponent(t.qrCode)}` }
  function download() {
    const svg = document.querySelector('.tm-detail-qr svg')
    if (!svg || !detail) return
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }))
    const a = document.createElement('a'); a.href = url; a.download = `QR-${detail.tableNumber}.svg`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function edit(t = { tableNumber: '', active: true }) { setFormError(''); setEditing({ ...t }) }
  function toggle(id) { setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]) }
  const sorted = [...tables].sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, 'vi', { numeric: true, sensitivity: 'base' }))
  const visible = sorted.filter(t => t.tableNumber.toLocaleLowerCase('vi').includes(filter.trim().toLocaleLowerCase('vi')) && (!status || t.status === status))
  const detail = tables.find(t => t.id === detailId)
  const selectedTables = sorted.filter(t => selected.includes(t.id))
  const allVisible = visible.length > 0 && visible.every(t => selected.includes(t.id))
  return <section className="tm-page">
    <header className="tm-heading"><div><span className="tm-eyebrow">QUẢN LÝ</span><h1>Bàn & mã QR</h1><p>Theo dõi trạng thái bàn và quản lý mã gọi món tại quán.</p></div><div className="tm-actions"><button className="btn btn-light" disabled={!selectedTables.length} onClick={() => setPrinting(selectedTables)}> <i className="bi bi-printer" /> In QR {selectedTables.length > 0 && `(${selectedTables.length})`}</button><button className="btn btn-primary" onClick={() => edit()}>+ Thêm bàn</button></div></header>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    <div className="tm-stats">{[['', 'Tất cả'], ...Object.entries(labels)].map(([value, label]) => <button key={value} className={`tm-stat ${status === value ? 'is-selected' : ''}`} aria-pressed={status === value} onClick={() => setStatus(value)}><span><i className={`tm-dot ${value || 'ALL'}`} />{label}</span><strong>{value ? tables.filter(t => t.status === value).length : tables.length}</strong></button>)}</div>
    <div className="tm-toolbar"><div className="tm-search"><i className="bi bi-search" /><input placeholder="Tìm tên bàn…" aria-label="Tìm bàn" value={filter} onChange={e => setFilter(e.target.value)} /></div><label className="tm-select-all"><input type="checkbox" checked={allVisible} disabled={!visible.length} onChange={() => setSelected(current => allVisible ? current.filter(id => !visible.some(t => t.id === id)) : [...new Set([...current, ...visible.map(t => t.id)])])} /> Chọn tất cả đang hiển thị</label>{selectedTables.length > 0 && <button className="btn btn-sm btn-light" onClick={() => setSelected([])}>Bỏ chọn ({selectedTables.length})</button>}</div>
    <div className="tm-workspace"><div className="tm-board"><div className="tm-board-heading"><h2>Danh sách bàn <span>{visible.length}</span></h2><small><i className="bi bi-arrow-repeat" /> Cập nhật mỗi 10 giây</small></div><div className="tm-grid">
      {visible.map(t => <article key={t.id} className={`tm-card ${detailId === t.id ? 'is-focused' : ''}`}><label className="tm-card-check"><input type="checkbox" aria-label={`Chọn ${t.tableNumber} để in QR`} checked={selected.includes(t.id)} onChange={() => toggle(t.id)} /></label><button className="tm-card-body" aria-label={`Xem chi tiết ${t.tableNumber}`} onClick={() => setDetailId(t.id)}><i className={`tm-dot ${t.status}`} /><i className="bi bi-grid tm-table-icon" /><strong>{t.tableNumber}</strong><span className={`tm-status ${t.status}`}>{labels[t.status] || t.status}</span><small><i className="bi bi-qr-code" /> {t.active ? 'QR sẵn sàng' : 'Ngưng nhận khách'}</small></button></article>)}
    </div>{!visible.length && <div className="tm-empty"><i className="bi bi-grid" /><p>{loading ? 'Đang tải bàn…' : 'Không có bàn phù hợp.'}</p></div>}</div>
    {detail ? <aside className="tm-detail" aria-label="Chi tiết bàn"><div className="tm-detail-heading"><div><span className="tm-eyebrow">CHI TIẾT BÀN</span><h2>{detail.tableNumber}</h2></div><button className="btn btn-light btn-sm" aria-label="Đóng chi tiết" onClick={() => setDetailId(null)}>✕</button></div><span className={`tm-status ${detail.status}`}>{labels[detail.status]}</span><p className="tm-detail-note">{detail.status === 'OCCUPIED' ? 'Bàn đang có phiên phục vụ. Phiên tự đóng khi thanh toán hết.' : detail.active ? 'Sẵn sàng nhận lượt khách mới.' : 'Khách chưa thể gọi món tại bàn này.'}</p><div className="tm-detail-qr"><QRCodeSVG value={qrUrl(detail)} size={180} marginSize={4} level="M" /><p>Quét mã để xem menu và gọi món</p></div><a className="tm-qr-link" href={qrUrl(detail)} target="_blank" rel="noreferrer">Mở trang gọi món <i className="bi bi-box-arrow-up-right" /></a><div className="tm-detail-buttons"><button className="btn btn-primary" onClick={() => setPrinting([detail])}><i className="bi bi-printer" /> In QR</button><button className="btn btn-light" onClick={download}>Tải QR</button><button className="btn btn-outline-primary" onClick={() => edit(detail)}>Sửa bàn</button><button className={`btn tm-availability ${detail.active ? 'btn-outline-danger' : 'btn-outline-success'}`} disabled={busy || (detail.active && detail.status === 'OCCUPIED')} onClick={() => { setAvailabilityError(''); setAvailability({ ...detail }) }}>{detail.active ? 'Ngưng phục vụ bàn' : 'Mở lại bàn'}</button></div>{detail.active && detail.status === 'OCCUPIED' && <p className="tm-help">Cần kết thúc phiên hiện tại trước khi ngưng phục vụ bàn.</p>}<p className="tm-help">Mã QR giữ nguyên khi đổi tên hoặc bật lại bàn.</p></aside> : <aside className="tm-detail tm-detail-placeholder"><i className="bi bi-hand-index" /><h2>Chọn một bàn</h2><p>Xem trạng thái, chỉnh sửa và tải mã QR tại đây.</p></aside>}</div>
    <details className="tm-origin"><summary><i className="bi bi-link-45deg" /> Địa chỉ website dùng trong QR</summary><form onSubmit={saveOrigin}><label htmlFor="qr-origin">Địa chỉ khách truy cập</label><div className="tm-actions"><input id="qr-origin" type="url" required className="form-control" value={originDraft} onChange={e => setOriginDraft(e.target.value)} /><button className="btn btn-primary">Lưu địa chỉ</button></div>{originError && <p className="text-danger" role="alert">{originError}</p>}<p>Đang dùng: <strong>{origin}</strong>. Địa chỉ được nhớ trên trình duyệt này. Dùng tên miền hoặc IP máy chủ trong Wi-Fi của quán để điện thoại quét được.</p></form></details>
    {availability && <div className="tm-overlay"><div className="tm-dialog" role="dialog" aria-modal="true" aria-labelledby="tm-availability-title"><h2 id="tm-availability-title">{availability.active ? 'Ngưng phục vụ' : 'Mở lại'} {availability.tableNumber}?</h2><p className="text-secondary mt-3">{availability.active ? 'Bàn sẽ chuyển sang Tạm ngưng, ẩn khỏi sơ đồ gọi món của nhân viên và không nhận đơn qua QR. Mã QR vẫn được giữ để dùng khi mở lại bàn.' : 'Bàn sẽ trở về trạng thái Trống và nhận đơn trở lại. Khách sử dụng mã QR đã in trước đó.'}</p>{availabilityError && <p className="text-danger" role="alert">{availabilityError}</p>}<div className="tm-actions justify-content-end"><button autoFocus className="btn btn-light" disabled={busy} onClick={() => setAvailability(null)}>Hủy</button><button className={`btn ${availability.active ? 'btn-danger' : 'btn-success'}`} disabled={busy} onClick={changeAvailability}>{busy ? 'Đang cập nhật…' : availability.active ? 'Xác nhận ngưng phục vụ' : 'Xác nhận mở lại bàn'}</button></div></div></div>}
    {editing && <div className="tm-overlay"><form className="tm-dialog" role="dialog" aria-modal="true" aria-labelledby="tm-edit-title" onSubmit={save}><h2 id="tm-edit-title">{editing.id ? 'Sửa bàn' : 'Thêm bàn'}</h2><label className="form-label mt-3" htmlFor="table-name">Tên bàn</label><input autoFocus id="table-name" className="form-control" required maxLength={30} value={editing.tableNumber} onChange={e => setEditing({ ...editing, tableNumber: e.target.value })} /><label className="d-flex gap-2 my-3"><input type="checkbox" checked={editing.active} disabled={editing.status === 'OCCUPIED'} onChange={e => setEditing({ ...editing, active: e.target.checked })} />Đang hoạt động</label><p className="text-secondary">Bàn có phiên đang mở không thể tạm ngưng. Mã QR được giữ nguyên khi chỉnh sửa.</p>{formError && <p className="text-danger" role="alert">{formError}</p>}<div className="tm-actions justify-content-end"><button type="button" disabled={busy} className="btn btn-light" onClick={() => setEditing(null)}>Hủy</button><button disabled={busy} className="btn btn-primary">{busy ? 'Đang lưu…' : 'Lưu bàn'}</button></div></form></div>}
    {printing && createPortal(<div className="tm-overlay tm-print-overlay"><div className="tm-print-dialog" role="dialog" aria-modal="true" aria-labelledby="tm-print-title"><div className="tm-print-toolbar"><div><h2 id="tm-print-title">In QR · {printing.length} bàn</h2><p>Kiểm tra địa chỉ trước khi in: {origin}</p></div><div className="tm-actions"><button className="btn btn-light" onClick={() => setPrinting(null)}>Đóng</button><button className="btn btn-primary" onClick={() => window.print()}>In mã QR</button></div></div><div className="tm-print-sheet">{printing.map(t => <div className="tm-print-label" key={t.id}><h3>Gạch Coffee</h3><h2>{t.tableNumber}</h2><QRCodeSVG value={qrUrl(t)} size={190} marginSize={4} level="M" /><p>Quét mã để xem menu và gọi món</p></div>)}</div></div></div>, document.body)}
  </section>
}
