import { Route } from 'react-router-dom'
import OnlineLayout from '../layouts/OnlineLayout'
import OnlineMenu from '../pages/online/OnlineMenu'
import OnlineCart from '../pages/online/OnlineCart'
import OnlineCheckout from '../pages/online/OnlineCheckout'
import OnlineTracking from '../pages/online/OnlineTracking'

// Tuyến đường đặt hàng online (/online-order)
export const thangdtRoutes = (
  <Route path="/online-order" element={<OnlineLayout />}>
    <Route index element={<OnlineMenu />} />
    <Route path="cart" element={<OnlineCart />} />
    <Route path="checkout" element={<OnlineCheckout />} />
    <Route path="orders" element={<OnlineTracking />} />
  </Route>
)
