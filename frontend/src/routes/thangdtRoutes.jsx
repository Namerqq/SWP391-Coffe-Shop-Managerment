import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import StaffLayout from '../layouts/StaffLayout'
import OnlineLayout from '../layouts/OnlineLayout'
import OnlineMenu from '../pages/online/OnlineMenu'
import OnlineCart from '../pages/online/OnlineCart'
import OnlineCheckout from '../pages/online/OnlineCheckout'
import OnlineTracking from '../pages/online/OnlineTracking'
import ShipOrderList from '../pages/cashier/ShipOrderList'
import WaiterDeliveries from '../pages/waiter/WaiterDeliveries'

// ThangDT: route các màn ThangDT (Online Order, Ship Order List cho Thu ngân, Đơn giao hàng của Phục vụ).
export const thangdtRoutes = (
  <>
    <Route path="/online-order" element={<OnlineLayout />}>
      <Route index element={<OnlineMenu />} />
      <Route path="cart" element={<OnlineCart />} />
      <Route path="checkout" element={<OnlineCheckout />} />
      <Route path="orders" element={<OnlineTracking />} />
    </Route>

    <Route
      path="/cashier/delivery-orders"
      element={
        <ProtectedRoute roles={['CASHIER']}>
          <StaffLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<ShipOrderList />} />
    </Route>

    <Route
      path="/waiter/deliveries"
      element={
        <ProtectedRoute roles={['WAITER']}>
          <StaffLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<WaiterDeliveries />} />
    </Route>
  </>
)
