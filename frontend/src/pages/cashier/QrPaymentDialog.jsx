import Modal from '../../components/Modal'
import QrPaymentPanel from './QrPaymentPanel'

/** Hộp "Xem mã QR": mở lại 1 mã đang chờ (từ hóa đơn bàn, màn bán mang đi...). qr = null thì không hiện. */
export default function QrPaymentDialog({ qr, title = 'Thanh toán QR', autoContinue = true, onChange, onPaid, onClose }) {
  if (!qr) return null
  return (
    <Modal show title={title} onClose={onClose}>
      <QrPaymentPanel key={qr.id} qr={qr} autoContinue={autoContinue} onChange={onChange} onPaid={onPaid} onClose={onClose} />
    </Modal>
  )
}
