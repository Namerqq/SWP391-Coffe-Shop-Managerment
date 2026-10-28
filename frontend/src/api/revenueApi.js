import axiosClient from './axiosClient'

// Quản lý: doanh thu của quán (UC-RP01 View Order Statistics).
const revenueApi = {
  // period: DAY | WEEK | MONTH | YEAR; date: yyyy-mm-dd, 1 ngày bất kỳ trong kỳ (bỏ trống = hôm nay)
  getReport: (period, date) => axiosClient.get('/manager/revenue', { params: date ? { period, date } : { period } }),
}

export default revenueApi
