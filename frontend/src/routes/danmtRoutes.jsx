import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import StaffLayout from '../layouts/StaffLayout'
import BaristaBoard from '../pages/barista/BaristaBoard'
import WaiterTables from '../pages/waiter/WaiterTables'
import WaiterTableDetail from '../pages/waiter/WaiterTableDetail'
import ReadyOrders from '../pages/serving/ReadyOrders'

// DanMT: route các màn Pha chế, Phục vụ, Món chờ mang ra.
export const danmtRoutes = (
  <>
    <Route path="/barista" element={<ProtectedRoute roles={['BARISTA']}><StaffLayout /></ProtectedRoute>}>
      <Route index element={<BaristaBoard />} />
    </Route>

    <Route path="/waiter" element={<ProtectedRoute roles={['WAITER']}><StaffLayout /></ProtectedRoute>}>
      <Route index element={<WaiterTables />} />
      <Route path="tables/:tableId" element={<WaiterTableDetail />} />
      <Route path="ready" element={<ReadyOrders type="DINE_IN" />} />
    </Route>

    <Route path="/cashier/pickup-ready" element={<ProtectedRoute roles={['CASHIER']}><StaffLayout /></ProtectedRoute>}>
      <Route index element={<ReadyOrders type="PICKUP" />} />
    </Route>
  </>
)
