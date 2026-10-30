import axiosClient from './axiosClient'

// ThangDT Iter 3: phục vụ đi giao đơn online (chỉ đơn được gán cho mình).
const waiterDeliveryApi = {
  getMyDeliveries: () => axiosClient.get('/waiter/deliveries'),
}

export default waiterDeliveryApi
