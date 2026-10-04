import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import ManagerLayout from '../layouts/ManagerLayout'
import ManagerOverview from '../pages/manager/ManagerOverview'
import InventoryList from '../pages/manager/InventoryList'

export const managerRoutes = (
  <Route path="/manager" element={<ProtectedRoute roles={['MANAGER']}><ManagerLayout /></ProtectedRoute>}>
    <Route index element={<ManagerOverview />} />
    <Route path="inventory" element={<InventoryList />} />
  </Route>
)
