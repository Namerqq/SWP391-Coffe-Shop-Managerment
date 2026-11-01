import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import StaffLayout from '../layouts/StaffLayout'
import CashierDashboard from '../pages/cashier/CashierDashboard'
import CashierTableMap from '../pages/cashier/CashierTableMap'
import BillDetail from '../pages/cashier/BillDetail'
import TakeawayPOS from '../pages/cashier/TakeawayPOS'
import ReceiptPage from '../pages/cashier/ReceiptPage'
import OrderHistory from '../pages/cashier/OrderHistory'
import ManagerLayout from '../layouts/ManagerLayout'
import ManagerRefundList from '../pages/manager/ManagerRefundList'
import LoyaltyCustomers from '../pages/cashier/LoyaltyCustomers'
import QrPaymentNotifier from '../pages/cashier/QrPaymentNotifier'
import OnlinePayLayout from '../pages/online/OnlinePayLayout'
import OnlinePayment from '../pages/online/OnlinePayment'
import OnlineQrPayment from '../pages/online/OnlineQrPayment'
import OnlineEReceipt from '../pages/online/OnlineEReceipt'

// ThangNN: route các màn Thu ngân. QrPaymentNotifier báo "khách đã thanh toán QR" trên mọi màn Thu ngân.
// Iter2: thêm các màn thanh toán online cho khách (không cần đăng nhập).
// Iter3: Lịch sử đơn (UC-C15), Khách thân thiết & lịch sử điểm (UC-C12 / C10 / C13),
// Hoàn tiền (thu ngân: popup trong Lịch sử đơn; quản lý hậu kiểm /manager/refunds).
export const thangnnRoutes = (
  <>
  <Route path="/cashier" element={<ProtectedRoute roles={['CASHIER']}><QrPaymentNotifier /><StaffLayout /></ProtectedRoute>}>
    <Route index element={<CashierDashboard />} />
    <Route path="tables" element={<CashierTableMap />} />
    <Route path="bill/:tableId" element={<BillDetail />} />
    <Route path="takeaway" element={<TakeawayPOS />} />
    <Route path="receipt/:paymentId" element={<ReceiptPage />} />
    <Route path="history" element={<OrderHistory />} />
    <Route path="loyalty" element={<LoyaltyCustomers />} />
  </Route>
  <Route path="/manager/refunds" element={<ProtectedRoute roles={['MANAGER']}><ManagerLayout /></ProtectedRoute>}>
    <Route index element={<ManagerRefundList />} />
  </Route>
  <Route element={<OnlinePayLayout />}>
    <Route path="/online-pay" element={<OnlinePayment />} />
    <Route path="/online-pay/qr" element={<OnlineQrPayment />} />
    <Route path="/online-receipts" element={<OnlineEReceipt />} />
  </Route>
  </>
)
