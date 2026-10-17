import { Route } from 'react-router-dom'
import GuestLayout from '../layouts/GuestLayout'
import GuestMenu from '../pages/guest/GuestMenu'
import GuestCart from '../pages/guest/GuestCart'
import GuestOrders from '../pages/guest/GuestOrders'

// KhoiBM: khách tự gọi món tại bàn qua QR, giỏ hàng và theo dõi đơn.
export const khoibmRoutes = (
  <Route element={<GuestLayout />}>
    <Route path="/menu" element={<GuestMenu />} />
    <Route path="/cart" element={<GuestCart />} />
    <Route path="/orders" element={<GuestOrders />} />
  </Route>
)
