import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import StaffLayout from '../layouts/StaffLayout'
import BaristaBoard from '../pages/barista/BaristaBoard'
import BaristaInventory from '../pages/barista/BaristaInventory'
import WaiterTables from '../pages/waiter/WaiterTables'
import WaiterTableDetail from '../pages/waiter/WaiterTableDetail'
import WaiterBoard from '../pages/waiter/WaiterBoard'
import ReadyOrders from '../pages/serving/ReadyOrders'

// DanMT: route các màn Pha chế, Phục vụ (bảng Chờ pha & mang ra), Mang đi chờ giao (Thu ngân).
export const danmtRoutes = (
  <>
    <Route path="/barista" element={<ProtectedRoute roles={['BARISTA']}><StaffLayout /></ProtectedRoute>}>
      <Route index element={<BaristaBoard />} />
      <Route path="inventory" element={<BaristaInventory />} />
    </Route>

    <Route path="/waiter" element={<ProtectedRoute roles={['WAITER']}><StaffLayout /></ProtectedRoute>}>
      <Route index element={<WaiterTables />} />
      <Route path="tables/:tableId" element={<WaiterTableDetail />} />
      <Route path="ready" element={<WaiterBoard />} />
    </Route>

    <Route path="/cashier/pickup-ready" element={<ProtectedRoute roles={['CASHIER']}><StaffLayout /></ProtectedRoute>}>
      <Route index element={<ReadyOrders type="PICKUP" />} />
    </Route>
  </>
)
