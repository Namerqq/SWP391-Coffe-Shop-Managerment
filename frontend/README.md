# Frontend Order — KhoiBM, Iter 1

Luồng đang sử dụng: menu → tùy chỉnh món → giỏ → gửi đơn → theo dõi/hủy pending. Không sửa đơn đã gửi, không có đăng nhập/nhân viên trong routes hiện tại.

| Phần | File/thư mục |
|---|---|
| Routes để ghép nhóm | src/routes/orderRoutes.jsx |
| Vỏ chạy demo | src/App.jsx, src/main.jsx |
| Menu | src/pages/customer/CustomerMenu.jsx |
| Giỏ và gửi đơn | src/pages/customer/OrderConfirmation.jsx |
| Theo dõi/hủy | src/pages/customer/OrderTracking.jsx |
| Tùy chỉnh món | src/components/ItemCustomizeModal.jsx |
| Hiển thị đơn/hộp hủy | src/components/orders/ |
| Khung trang | src/layouts/CustomerLayout.jsx, CafeLayout.jsx |
| API | src/api/cafeClient.js, menuApi.js, orderApi.js, tableApi.js |
| Trạng thái chia sẻ | src/context/CartContext.jsx, MenuContext.jsx, OrdersContext.jsx, ToastContext.jsx |
| Phiên bàn | src/context/AuthContext.jsx (hiện còn tên và code phiên nhân viên cũ) |
| Theme | src/styles/theme.css |
| Hàm tiện ích | src/utils/ |

Các file LoginPage, ProtectedRoute, WaiterLayout, pages/waiter, authApi và nhánh staff trong context là code cũ không được gắn vào App hiện tại, chưa xóa trong lần chuẩn bị bàn giao. Product/AppNavbar là mẫu ban đầu. Không coi những file này là phần home/login/serving chính thức của nhóm.

Để ghép: import orderRoutes vào router chung cùng các routes của thành viên khác; module này không khai báo `/`, `/login`, `/logout` hoặc wildcard. Thay route `/` demo trong App.jsx bằng Home của nhóm. Giữ một BrowserRouter chung. Theme/font hiện ở main.jsx cần thống nhất với người làm home.

Chạy từ frontend:

```sh
npm ci
CAFE_BACKEND_URL=http://127.0.0.1:8084 npm run dev -- --host 127.0.0.1 --port 5185 --strictPort
npm run build
```

Cấu hình MySQL, seed bàn T-08, API và quy ước với serving/thanh toán: xem [KHOIBM.md](../KHOIBM.md).
