import axiosClient from './axiosClient'

const managerDashboardApi = {
  getSummary: () => axiosClient.get('/manager/dashboard/summary'),
  triggerLowStockJob: () => axiosClient.post('/manager/inventory/low-stock-job/run'),
}

export default managerDashboardApi
