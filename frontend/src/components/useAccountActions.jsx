import { useState } from 'react'
import ConfirmModal from './ConfirmModal'
import adminApi from '../api/adminApi'
import { errorMessage } from '../api/axiosClient'
import { useToast } from '../context/ToastContext'

/**
 * Dùng chung cho Danh sách & Chi tiết tài khoản:
 *  - Vô hiệu hóa (UC-AD05) / Kích hoạt lại / Mở khóa
 *  - Xóa tài khoản
 * Trả về các hàm hỏi xác nhận + phần tử modal cần render.
 */
export default function useAccountActions({ onStatusChanged, onDeleted }) {
  const toast = useToast()
  const [pending, setPending] = useState(null) // { type, account }
  const [loading, setLoading] = useState(false)

  const close = () => !loading && setPending(null)

  const run = async () => {
    const { type, account } = pending
    setLoading(true)
    try {
      if (type === 'delete') {
        await adminApi.deleteUser(account.id)
        toast(`Đã xóa tài khoản ${account.username}`)
        onDeleted?.(account)
      } else {
        const status = type === 'deactivate' ? 'INACTIVE' : 'ACTIVE'
        const res = await adminApi.updateStatus(account.id, status)
        toast(type === 'deactivate' ? `Đã vô hiệu hóa ${account.username}` : `Đã kích hoạt ${account.username}`)
        onStatusChanged?.(res.data)
      }
      setPending(null)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }

  const config = pending && {
    deactivate: {
      title: 'Vô hiệu hóa tài khoản',
      message: <>Tài khoản <strong>{pending.account.username}</strong> sẽ không thể đăng nhập và bị đăng xuất ngay. Dữ liệu và lịch sử vẫn được giữ nguyên. Bạn có thể kích hoạt lại bất cứ lúc nào.</>,
      confirmText: 'Vô hiệu hóa',
      danger: true,
    },
    activate: {
      title: pending.account.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Kích hoạt tài khoản',
      message: <>Cho phép <strong>{pending.account.username}</strong> đăng nhập lại vào hệ thống?</>,
      confirmText: pending.account.status === 'LOCKED' ? 'Mở khóa' : 'Kích hoạt',
    },
    delete: {
      title: 'Xóa tài khoản',
      message: <>Xóa vĩnh viễn tài khoản <strong>{pending.account.username}</strong>? Chỉ xóa được tài khoản chưa phát sinh dữ liệu (đơn hàng, thanh toán, kho...). Nếu đã có dữ liệu, hãy dùng <em>Vô hiệu hóa</em>.</>,
      confirmText: 'Xóa',
      danger: true,
    },
  }[pending.type]

  const modal = (
    <ConfirmModal show={!!pending} loading={loading} onClose={close} onConfirm={run} {...(config || {})} />
  )

  return {
    askToggleStatus: (account) => setPending({ type: account.status === 'ACTIVE' ? 'deactivate' : 'activate', account }),
    askDelete: (account) => setPending({ type: 'delete', account }),
    modal,
  }
}
