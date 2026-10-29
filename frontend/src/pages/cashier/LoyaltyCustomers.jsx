import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatDateTime, initials } from '../../utils/format'
import CustomerFormModal from './CustomerFormModal'
import LoyaltyHistoryModal from './LoyaltyHistoryModal'
import '../../styles/cashier.css'

// Loyalty Customer List & Point History — SRS 1.3.7, UC-C12 / UC-C10 / UC-C13 (ThangNN Iter3).
// Danh sách khách thân thiết: tìm theo SĐT hoặc tên, thêm khách mới, sửa tên (không sửa SĐT), xem lịch sử điểm (popup).
// ?customer=<id> trên URL -> mở sẵn popup lịch sử điểm (dùng khi quay lại từ trang hóa đơn).

const PAGE_SIZE = 20

const SORTS = [
  { value: 'recent', label: 'Mới đăng ký trước' },
  { value: 'points', label: 'Điểm cao nhất' },
  { value: 'name', label: 'Tên A-Z' },
]

export default function LoyaltyCustomers() {
  const [params, setParams] = useSearchParams()
  const openId = Number(params.get('customer')) || null

  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('') // keyword sau khi ngừng gõ 300ms
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ show: false, customer: null })
  const [historyKey, setHistoryKey] = useState(0)
  const [notice, setNotice] = useState('')
  const requestNo = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => { setQuery(keyword.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [keyword])

  const load = useCallback(async () => {
    const no = ++requestNo.current
    setLoading(true)
    try {
      const res = await cashierApi.getLoyaltyCustomers({ keyword: query || undefined, sort, page, size: PAGE_SIZE })
      if (no !== requestNo.current) return
      // Trang hiện tại trống (vd. vừa đổi bộ lọc) mà vẫn còn trang trước -> lùi về trang cuối.
      if (res.data.items.length === 0 && page > 0 && res.data.totalPages > 0) {
        setPage(res.data.totalPages - 1)
        return
      }
      setData(res.data)
      setError('')
    } catch (e) {
      if (no !== requestNo.current) return
      setError(errorMessage(e, 'Không tải được danh sách khách thân thiết.'))
    } finally {
      if (no === requestNo.current) setLoading(false)
    }
  }, [query, sort, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const openHistory = (id) => setParams({ customer: String(id) }, { replace: true })
  const closeHistory = () => setParams({}, { replace: true })

  const onSaved = (saved) => {
    const editing = !!form.customer?.id // form.customer = { prefill } khi đăng ký nhanh số vừa tìm
    setForm({ show: false, customer: null })
    setNotice(editing
      ? `Đã lưu tên khách ${saved.fullName || "(không tên)"}, số ${saved.phoneNumber}.`
      : `Đã đăng ký khách thân thiết ${saved.fullName ? `${saved.fullName} (${saved.phoneNumber})` : saved.phoneNumber}.`)
    if (!editing) {
      // Khách mới hiện ở đầu danh sách "Mới đăng ký trước".
      setKeyword('')
      setQuery('')
      setSort('recent')
      setPage(0)
    }
    setHistoryKey((k) => k + 1)
    load()
  }

  const items = data?.items || []
  const totalPages = data?.totalPages || 0

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title">Khách thân thiết</h1>
          <p className="page-subtitle">
            Tìm khách theo số điện thoại hoặc tên, đăng ký khách mới, sửa tên khách và xem lịch sử tích / dùng điểm.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setForm({ show: true, customer: null })}>
          <i className="bi bi-person-plus me-1" aria-hidden="true" />Thêm khách
        </button>
      </div>

      {notice && <div className="alert alert-success py-2">{notice}</div>}

      <div className="cf-card">
        <div className="d-flex flex-wrap gap-2 p-3 border-bottom" style={{ borderColor: 'var(--cf-border)' }}>
          <div className="input-icon flex-grow-1" style={{ minWidth: 220 }}>
            <i className="bi bi-search" />
            <input className="form-control" placeholder="Tìm số điện thoại hoặc tên khách..." value={keyword}
                   onChange={(e) => setKeyword(e.target.value)} aria-label="Tìm khách" />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={sort} aria-label="Sắp xếp"
                  onChange={(e) => { setSort(e.target.value); setPage(0) }}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {keyword && (
            <button type="button" className="btn btn-link text-decoration-none" onClick={() => setKeyword('')}>Xóa tìm</button>
          )}
        </div>

        {error && <div className="alert alert-danger m-3">{error}</div>}
        {loading && !data && !error && (
          <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>
        )}

        {data && items.length === 0 && (
          <div className="empty-state">
            <i className="bi bi-people" />
            {query ? `Không có khách nào khớp "${query}".` : 'Chưa có khách thân thiết nào.'}
            {query && /^[\d\s.-]+$/.test(query) && (
              <div className="mt-3">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setForm({ show: true, customer: { prefill: query } })}>
                  Đăng ký số {query}
                </button>
              </div>
            )}
          </div>
        )}

        {items.length > 0 && (
          <div className={`table-responsive ${loading ? 'opacity-50' : ''}`}>
            <table className="table cf-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Khách</th>
                  <th className="text-end">Điểm hiện có</th>
                  <th>Tham gia</th>
                  <th>Tích / dùng điểm gần nhất</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="row-clickable" onClick={() => openHistory(c.id)}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="avatar">{initials(c.fullName || 'Khách')}</span>
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-semibold text-truncate">{c.fullName || <span className="cf-muted fw-normal">Chưa có tên</span>}</div>
                          <div className="cell-sub">{c.phoneNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-end fw-semibold">{c.currentPoints}</td>
                    <td className="text-nowrap">{formatDateTime(c.createdAt)}</td>
                    <td className="text-nowrap">{c.lastActivityAt ? formatDateTime(c.lastActivityAt) : <span className="cf-muted">Chưa có</span>}</td>
                    <td className="text-end text-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn btn-sm btn-light-soft me-1" onClick={() => openHistory(c.id)}>
                        <i className="bi bi-clock-history me-1" aria-hidden="true" />Lịch sử điểm
                      </button>
                      <button type="button" className="btn btn-sm btn-light-soft" aria-label={`Sửa tên ${c.fullName || c.phoneNumber}`} title="Sửa tên"
                              onClick={() => setForm({ show: true, customer: c })}>
                        <i className="bi bi-pencil" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalItems > 0 && (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top" style={{ borderColor: 'var(--cf-border)' }}>
            <div className="cell-sub">
              {data.totalItems} khách{query && ` khớp "${query}"`}
              {totalPages > 1 && ` · trang ${page + 1}/${totalPages}`}
            </div>
            {totalPages > 1 && (
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-sm btn-light-soft" disabled={page === 0 || loading}
                        onClick={() => setPage((p) => p - 1)}>
                  <i className="bi bi-chevron-left" aria-hidden="true" /> Trước
                </button>
                <button type="button" className="btn btn-sm btn-light-soft" disabled={page + 1 >= totalPages || loading}
                        onClick={() => setPage((p) => p + 1)}>
                  Sau <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Đang mở hộp sửa (nằm trên popup lịch sử) -> Esc / bấm nền chỉ đóng hộp sửa, chưa đóng popup lịch sử. */}
      <LoyaltyHistoryModal customerId={openId} reloadKey={historyKey} onClose={form.show ? undefined : closeHistory}
                           onEdit={(c) => setForm({ show: true, customer: c })} />
      <CustomerFormModal show={form.show} customer={form.customer?.id ? form.customer : null}
                         prefillPhone={form.customer?.prefill}
                         onClose={() => setForm({ show: false, customer: null })} onSaved={onSaved} />
    </>
  )
}
