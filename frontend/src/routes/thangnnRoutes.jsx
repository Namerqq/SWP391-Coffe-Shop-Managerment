import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import StaffLayout from '../layouts/StaffLayout'
import CashierDashboard from '../pages/cashier/CashierDashboard'
import CashierTableMap from '../pages/cashier/CashierTableMap'

// ThangNN: route các màn Thu ngân.
export const thangnnRoutes = (
  <Route path="/cashier" element={<ProtectedRoute roles={['CASHIER']}><StaffLayout /></ProtectedRoute>}>
    <Route index element={<CashierDashboard />} />
    <Route path="tables" element={<CashierTableMap />} />
  </Route>
)
