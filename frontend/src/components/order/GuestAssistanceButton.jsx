import { useEffect, useRef, useState } from 'react'
import Modal from '../Modal'
import guestTableApi from '../../api/guestTableApi'
import { errorMessage } from '../../api/axiosClient'

/** Lives in the guest layout so switching between menu/cart/orders keeps the call visible. */
export default function GuestAssistanceButton({ table, onExpired }) {
  const generation = useRef(0)
  const submitting = useRef(false)
  const expireRef = useRef(onExpired)
  expireRef.current = onExpired
  const [call, setCall] = useState(null)
  const [show, setShow] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const active = call && call.status !== 'COMPLETED'
  const coolingDown = call?.status === 'COMPLETED' && now < Date.parse(call.updatedAt) + 30000

  useEffect(() => {
    let live = true
    let loading = false
    const load = async () => {
      if (loading || submitting.current) return
      loading = true
      const version = generation.current
      try {
        const response = await guestTableApi.getAssistance()
        if (live && version === generation.current) { setCall(response.status === 204 ? null : response.data); setError('') }
      } catch (e) {
        if (live && version === generation.current) {
          // 410 = phiên không còn dùng được: GuestLayout tự xử lý, cần truyền nguyên lỗi để nó đọc được mã lỗi và token.
          if (e.response?.status === 410) expireRef.current(e)
          else setError(errorMessage(e))
        }
      } finally { loading = false }
    }
    load()
    const timer = setInterval(load, 5000)
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => { live = false; clearInterval(timer); clearInterval(clock) }
  }, [table.tableId]) // onExpired is only used on an invalid session.

  const send = async () => {
    submitting.current = true
    generation.current += 1
    setBusy(true)
    setError('')
    try {
      const response = await guestTableApi.callAssistance(note.trim() || null)
      setCall(response.data)
      setShow(false)
      setNote('')
    } catch (e) {
      setError(errorMessage(e))
      if (e.response?.status === 410) expireRef.current(e)
    } finally { submitting.current = false; setBusy(false) }
  }
  const label = call?.status === 'ACCEPTED' ? 'Nhân viên đã nhận'
    : active ? 'Đã gọi · Chờ nhân viên' : coolingDown ? 'Vui lòng chờ để gọi lại' : 'Gọi nhân viên'
  return (
    <div className="gx-assistance">
      <button type="button" className="gx-assistance-button" disabled={busy || active || coolingDown}
        title={call?.status === 'ACCEPTED' ? `${call.acceptedByName || 'Nhân viên'} đang đến hỗ trợ` : label}
        onClick={() => { setError(''); setShow(true) }}>
        <i className="bi bi-bell" aria-hidden="true" /><span>{label}</span>
      </button>
      <span className="visually-hidden" role="status">{label}</span>
      {error && !show && <small className="text-danger" role="alert">{error}</small>}
      <Modal show={show} title={`Gọi nhân viên đến ${table.tableNumber}?`}
        onClose={busy ? undefined : () => setShow(false)} footer={
          <>
            <button type="button" className="btn btn-light-soft" disabled={busy} onClick={() => setShow(false)}>Để sau</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={send}>
              {busy ? 'Đang gửi…' : 'Gọi nhân viên'}
            </button>
          </>
        }>
        <p>Nhân viên sẽ đến bàn hỗ trợ bạn.</p>
        <label htmlFor="guest-assistance-note" className="form-label">Ghi chú (không bắt buộc)</label>
        <textarea id="guest-assistance-note" className="form-control" rows={2} maxLength={300}
          placeholder="Ví dụ: cần thêm khăn giấy" disabled={busy}
          value={note} onChange={(e) => setNote(e.target.value)} />
        {error && <div className="text-danger mt-2" role="alert">{error}</div>}
      </Modal>
    </div>
  )
}
