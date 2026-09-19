# Khung dự án Node.js + React

Cấu trúc này được xây dựng theo đúng mô hình kiến trúc và cây thư mục trong 3 ảnh bạn gửi:
`Client -> Middleware -> Controller -> Service -> Database` (và ngược lại khi trả response).

```
project/
├── server/     # Backend Node.js + Express
└── client/     # Frontend React (Vite)
```

## 1. Backend (server/)

```
server/src/
├── config/        # Chuỗi kết nối database (db.js)
├── controllers/   # Đón request từ client, gọi service, trả response
├── enum/          # Các hằng số: giới tính, trạng thái,...
├── middlewares/   # auth.middleware.js, error.middleware.js
├── resources/     # Các đoạn text fix cứng (message lỗi, thông báo)
├── routes/        # Định tuyến API
├── services/      # Gọi dữ liệu từ Database
├── utils/         # Hàm dùng chung (response.util.js,...)
└── index.js       # Khởi tạo & cấu hình app
```

**Cách chạy:**
```bash
cd server
npm install
cp .env.example .env   # rồi chỉnh sửa DB_URI, PORT,...
npm run dev
```

**Luồng xử lý một request** (đúng theo sơ đồ ảnh 1):
1. Client gửi `Request(1)` → Middleware
2. Middleware hợp lệ → đi tiếp `(3)` xuống Controller, hoặc trả luôn `Response(2)` nếu chặn lại (vd: thiếu token)
3. Controller gọi Service `(4)`
4. Service truy vấn Database `(5)`, Database trả dữ liệu về Service `(6)`
5. Service trả dữ liệu về Controller `(7)`
6. Controller trả `Response(8)` về Client

## 2. Frontend (client/)

```
client/src/
├── api/           # axiosClient.js - chứa api url, cấu hình chung
├── assets/        # images, font, thư viện dùng chung
├── components/    # Component dùng chung, tái sử dụng (Button,...)
├── layouts/       # Header, Main, Footer
├── pages/         # Các trang/màn hình (Home,...)
├── redux/         # Cấu hình redux store (nếu dùng)
├── resources/     # Text đa ngôn ngữ (vi.js, en.js)
├── routes/        # Định tuyến các trang
├── services/      # Nơi lấy dữ liệu khi gọi API
├── utils/         # formatDate.js, validateEmail.js,...
├── App.jsx        # Router + hiển thị trang
└── main.jsx       # Entry point
```

**Cách chạy:**
```bash
cd client
npm install
cp .env.example .env   # chỉnh VITE_API_URL nếu cần
npm run dev
```

Mặc định: backend chạy ở `http://localhost:8080`, frontend chạy ở `http://localhost:5173`.

## 3. Tính năng REALTIME (Đặt hàng → Nhân viên nhận đơn ngay lập tức)

Đã tích hợp sẵn **Socket.IO** cho module **Order**:

- **Trang khách hàng**: `/order` — điền form và bấm "Xác nhận đặt hàng" → gọi `POST /api/orders`.
- **Trang nhân viên**: `/staff` — tự động connect socket, vào phòng `"staff"`, và **nhận đơn mới ngay lập tức** (event `new-order`) không cần load lại trang. Có nút "Xác nhận" để đổi trạng thái đơn (`PATCH /api/orders/:id/status`), việc này cũng bắn realtime `order-updated`.

**Luồng chạy:**
```
Khách bấm "Đặt hàng" --Request(1)--> Controller lưu Database
                                          |
                                          |--> Response(8) xác nhận về cho Khách
                                          |--> emit("new-order") qua Socket.IO
                                                    |
                                                    v
                                     Staff Dashboard nhận ngay lập tức, tự thêm vào bảng
```

Cấu trúc mới thêm:
```
server/src/sockets/socket.js       # khởi tạo & quản lý Socket.IO
server/src/services/order.service.js
server/src/controllers/order.controller.js
server/src/routes/order.routes.js

client/src/api/socketClient.js     # kết nối Socket.IO phía client
client/src/pages/Order/Order.jsx   # trang khách đặt hàng
client/src/pages/Staff/StaffDashboard.jsx  # trang nhân viên nhận đơn realtime
```

## 4. Deploy lên môi trường thật (có Socket.IO)

⚠️ **Lưu ý quan trọng khi có Socket.IO**: Socket.IO cần một tiến trình Node.js chạy **liên tục** (giữ kết nối mở), nên **KHÔNG deploy backend lên nền tảng serverless** (như Vercel Serverless Functions) vì các nền tảng đó tắt tiến trình sau mỗi request, sẽ làm rớt kết nối realtime liên tục.

**Nên deploy backend lên các nền tảng chạy Node.js server liên tục:**
- Render (Web Service, không phải Static Site)
- Railway
- Fly.io
- VPS riêng (DigitalOcean, AWS EC2,...)

**Các bước:**
1. Tạo Database thật (MongoDB Atlas).
2. Deploy thư mục `server/` lên Render/Railway/VPS → có domain thật, vd `https://my-api.onrender.com`.
3. Khai báo biến môi trường trên hosting: `DB_URI`, `PORT`, `CLIENT_URL` (domain frontend thật, để cấu hình CORS + Socket.IO cho đúng, không để `*` khi lên production).
4. Deploy thư mục `client/` lên Vercel/Netlify (frontend tĩnh vẫn deploy bình thường, không bị ảnh hưởng bởi vấn đề serverless ở trên).
5. Cập nhật biến môi trường frontend: `VITE_API_URL` và `VITE_SOCKET_URL` trỏ về domain backend thật (vd `https://my-api.onrender.com` và `https://my-api.onrender.com/api`).
6. Mở 2 trình duyệt (hoặc 2 thiết bị) — 1 vào `/order` để đặt hàng, 1 vào `/staff` — để test xem đơn mới có hiện ra ngay trên dashboard nhân viên hay không.

## 5. Ghi chú khác
- Đã có sẵn ví dụ đầy đủ cho module **User**: route → middleware → controller → service → database (server) và service → page Home hiển thị danh sách user (client).
- Bạn chỉ cần copy pattern này (Order, User) để thêm các module khác (Product, Voucher,...).
- File `.env` thật không được commit lên git (đã có trong `.gitignore`), chỉ dùng `.env.example` làm mẫu.
