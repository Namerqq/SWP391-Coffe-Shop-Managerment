import { Route } from 'react-router-dom'
import GuestLayout from '../layouts/GuestLayout'
import GuestMenu from '../pages/guest/GuestMenu'
import GuestCart from '../pages/guest/GuestCart'
import GuestOrders from '../pages/guest/GuestOrders'
import ProtectedRoute from '../components/ProtectedRoute'
import StaffLayout from '../layouts/StaffLayout'
import AssistOrder from '../pages/assist/AssistOrder'

// KhoiBM: khách gọi món tại bàn (mở bằng QR: /menu?table=<mã QR bàn>) + Phục vụ gọi món giúp.
export const khoibmRoutes = (
  <>
    <Route element={<GuestLayout />}>
      <Route path="/menu" element={<GuestMenu />} />
      <Route path="/cart" element={<GuestCart />} />
      <Route path="/orders" element={<GuestOrders />} />
    </Route>
    <Route path="/waiter/assist-order" element={<ProtectedRoute roles={['WAITER']}><StaffLayout /></ProtectedRoute>}><Route index element={<AssistOrder />} /></Route>
  </>
)
