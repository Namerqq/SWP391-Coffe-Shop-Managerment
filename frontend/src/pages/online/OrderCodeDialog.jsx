import { useState } from 'react'
import Modal from '../../components/Modal'
import { copyText } from '../../utils/onlineOrderCode'
import '../../styles/online-pay.css'

/**
 * Popup báo mã đơn cho khách đặt online, hiện 1 lần ngay sau khi đặt xong (COD) hoặc trả QR xong.
 * Khách cần mã này để xem lại đơn / hóa đơn (không còn tra theo số điện thoại).
 */
export default function OrderCodeDialog({ code, paid, onClose }) {
  const [copied, setCopied] = useState(null) // null | true | false

  const copy = async () => setCopied(await copyText(code))

  return (
    <Modal
      show={Boolean(code)}
      title={paid ? 'Thanh toán thành công' : 'Đặt hàng thành công'}
      onClose={onClose}
      footer={<button type="button" className="btn btn-primary w-100" onClick={onClose}>Tôi đã lưu mã đơn</button>}
    >
      <p className="mb-2">{paid ? 'Quán đã nhận tiền và đang chuẩn bị đơn của bạn.' : 'Quán đã nhận đơn của bạn.'} Mã đơn của bạn là:</p>
      <div className="op-code">
        <strong>{code}</strong>
        <button type="button" className="btn btn-light-soft" onClick={copy}>
          <i className={`bi ${copied ? 'bi-check2' : 'bi-copy'}`} aria-hidden="true" /> {copied ? 'Đã sao chép' : 'Sao chép'}
        </button>
      </div>
      {copied === false && <p className="text-danger small mb-2">Chưa sao chép được, bạn hãy ghi lại mã đơn ở trên.</p>}
      <p className="gx-muted small mb-0">
        Hãy lưu lại mã này. Muốn xem lại đơn hàng hoặc hóa đơn (nhất là trên máy khác), bạn cần nhập đúng mã đơn.
      </p>
    </Modal>
  )
}
