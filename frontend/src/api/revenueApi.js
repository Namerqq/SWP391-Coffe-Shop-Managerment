import axiosClient from './axiosClient'

// Quản lý: doanh thu của quán (UC-RP01 View Order Statistics).
const revenueApi = {
  getReport: (period, date, fromDate, toDate) => {
    const params = { period }
    if (date) params.date = date
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    return axiosClient.get('/manager/revenue', { params })
  },
}

export default revenueApi
