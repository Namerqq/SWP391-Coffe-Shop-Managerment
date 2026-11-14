# Hướng dẫn: điện thoại quét QR bàn để gọi món (chạy trên máy tính)

Mô hình: **máy tính** chạy backend (8080) + frontend Vite (5173). **Điện thoại** bắt Wi-Fi hotspot do máy tính phát (hoặc cùng Wi-Fi với máy), quét QR, rồi mở `http://<IP-máy>:5173/menu?table=...`.

Điện thoại chỉ cần vào được cổng **5173**. Vite tự chuyển tiếp `/api` và `/uploads` sang backend `localhost:8080`, nên không phải sửa CORS hay IP trong code.

## 1. Bật hotspot trên máy tính (Windows)

1. Settings → Network & Internet → **Mobile hotspot** → bật On.
2. Điện thoại kết nối vào Wi-Fi đó (tên + mật khẩu hiện ngay trên màn hình đó).
3. Khi bật hotspot, máy tính luôn có IP **192.168.137.1** trên mạng này.

> Nếu điện thoại và máy tính đã cùng một Wi-Fi thì bỏ qua bước này, dùng IP Wi-Fi của máy (xem bằng `ipconfig`).

## 2. Mở firewall cho cổng 5173 (chỉ làm 1 lần)

Nhấp đúp file **`frontend/mo-firewall-5173.bat`** → bấm Yes khi Windows hỏi quyền Admin.

Đây là lý do hay gặp nhất khiến điện thoại không mở được web: mạng hotspot thường bị Windows xếp loại **Public**, mà Node.js chỉ được phép chạy trên mạng Private.

Làm tay cũng được, mở CMD **Run as administrator** rồi gõ:

```
netsh advfirewall firewall add rule name="Cafe QR Order - Vite 5173" dir=in action=allow protocol=TCP localport=5173 profile=any
```

## 3. Chạy hệ thống

```
# Terminal 1 – backend
cd backend
mvn spring-boot:run

# Terminal 2 – frontend
cd frontend
npm install      (lần đầu)
npm run dev
```

Terminal frontend sẽ in ra:

```
  ➜  QR bàn sẽ dùng: http://192.168.137.1:5173
     * Local Area Connection* 10      http://192.168.137.1:5173
       Wi-Fi                          http://192.168.1.23:5173
```

Dòng có dấu `*` là địa chỉ được in vào QR.

## 4. Thử từ điện thoại trước khi in QR

Trên điện thoại, mở Chrome/Safari, gõ `http://192.168.137.1:5173`.

- Hiện trang chủ quán → mạng OK, sang bước 5.
- Không vào được → kiểm tra lại bước 2 (firewall), và xem điện thoại đã bắt đúng hotspot chưa. Nhớ gõ `http://`, không phải `https://`.

## 5. Tạo / in QR

1. Đăng nhập Manager → **Bàn & mã QR**.
2. Mở mục **"Địa chỉ website dùng trong QR"** → bấm nút `http://192.168.137.1:5173 (hotspot)` (nút màu xanh là địa chỉ đang dùng).
3. Chọn bàn → **In QR** hoặc **Tải QR**.
4. Dùng camera điện thoại (hoặc Zalo) quét QR → trang **Thực đơn** mở ra với tên bàn ở góc trên → chọn món → Giỏ hàng → Gửi đơn.

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Quét QR xong trang không tải, báo "không thể truy cập" | Firewall chặn 5173 (bước 2), hoặc QR đang in IP Wi-Fi trong khi điện thoại bắt hotspot → chọn lại IP 192.168.137.1 ở bước 5 |
| Trang mở được nhưng báo "Không kết nối được máy chủ. Backend đã chạy chưa?" | Backend chưa chạy, hoặc không chạy ở cổng 8080 (đặt `VITE_BACKEND_URL` trong `frontend/.env`) |
| "Mã QR bàn không hợp lệ" | Bàn đã bị xóa / QR in từ database cũ → in lại QR |
| "... đang tạm ngưng phục vụ" | Bàn đang Tạm ngưng → Manager mở lại bàn |
| Máy có nhiều card mạng, Vite dò sai IP | Tạo `frontend/.env` với dòng `VITE_PUBLIC_ORIGIN=http://192.168.137.1:5173` rồi chạy lại `npm run dev` |
| Hotspot không bật được | Máy phải đang có Internet (Wi-Fi/LAN) thì Windows mới cho bật Mobile hotspot |
