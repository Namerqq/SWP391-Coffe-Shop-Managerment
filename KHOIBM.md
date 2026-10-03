# KhoiBM — Order Iter 1

## Phạm vi bàn giao

Khách mở menu (giả lập quét QR, mặc định bàn T-08), chọn món, tùy chỉnh size/đường/đá/topping, chỉnh giỏ trước khi gửi, gửi đơn và theo dõi tiến độ. Sau khi gửi **không sửa được đơn**. Chỉ được hủy đơn của phiên trình duyệt hiện tại khi trạng thái là `PENDING_CONFIRMATION` và chưa có món được xử lý; backend kiểm tra lại trong transaction.

Home, login/logout, phục vụ và thanh toán thuộc thành viên khác. Không có màn hay liên kết nhân viên trong ứng dụng đang chạy. Code nhân viên cũ vẫn còn trong source chờ quyết định loại bỏ; login backend mặc định tắt, không dùng phần này để thay thế module xác thực chung.

## Chạy trên máy thành viên

1. Dùng Java 17 trở lên, Maven, Node/npm và MySQL tương thích schema freeze.
2. Tạo database local **rỗng**, sao chép `backend/application-local.properties.example` thành `backend/application-local.properties`, điền URL/user/password. File local này bị Git bỏ qua.
3. Chạy backend để Flyway áp dụng V1/V2. Không chạy schema.sql chứa DROP DATABASE trên dữ liệu làm việc. Không sửa migration freeze hoặc tự baseline database có schema cũ.
4. Nếu cần menu demo, nạp `database/seed-dev.sql` đúng một lần vào database trống. File có `USE cafe_management`; chọn đúng database khi máy dùng tên khác.
5. Chạy `backend/dev/iter1-table.sql` trên database đó để thêm bàn T-08. Script có thể chạy lại. Xác nhận bàn có cả `table_number=T-08` và `qr_code=T-08`; nếu dữ liệu nhóm đã dùng một trong hai giá trị cho bàn khác, giải quyết trùng dữ liệu trước, không đổi bàn có đơn cũ.

Backend (từ thư mục project):

```sh
cd backend
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8084 --server.address=127.0.0.1"
```

Frontend, terminal khác:

```sh
cd frontend
npm ci
CAFE_BACKEND_URL=http://127.0.0.1:8084 npm run dev -- --host 127.0.0.1 --port 5185 --strictPort
```

PowerShell:

```powershell
$env:CAFE_BACKEND_URL="http://127.0.0.1:8084"
npm run dev -- --host 127.0.0.1 --port 5185 --strictPort
```

Mở `/menu`, `/cart`, `/orders` trên http://127.0.0.1:5185. Nếu cổng bị chiếm, dừng terminal chạy cũ hoặc chọn cổng khác và thêm origin tương ứng vào `CAFE_ALLOWED_ORIGINS`.

Máy KhoiBM dùng `cafe_management_frozen` trong cấu hình local; đây không phải tên database bắt buộc cho nhóm. Không đưa mật khẩu hoặc tài khoản demo local vào Git.

## QR demo

Điện thoại và máy chạy server cần cùng Wi-Fi. Chạy Vite với `--host 0.0.0.0`, dùng link `http://<IP-Wi-Fi-của-Mac>:5185/menu` để tạo QR. Thêm chính origin đó vào `CAFE_ALLOWED_ORIGINS` rồi khởi động lại backend. Backend vẫn có thể chỉ bind 127.0.0.1 vì Vite proxy `/api`. Không đặt localhost/127.0.0.1 trong QR cho điện thoại. Cần kiểm tra mạng Wi-Fi thực tế trước buổi demo.

`CAFE_FIXED_TABLE_QR` mặc định T-08. Khi nhóm làm QR thật, đặt biến này thành chuỗi rỗng; link `/menu?table=<qr_code>` sẽ xác nhận bàn từ database. Không đổi schema freeze cho việc này.

## Ghép frontend với nhóm

`frontend/src/routes/orderRoutes.jsx` xuất `orderRoutes`, chỉ gồm `/menu`, `/cart`, `/orders` dưới layout order. Thêm các route này cạnh route home/login/serving/payment của nhóm.

`App.jsx` hiện là vỏ demo: chỉ route `/` chuyển sang menu; khi ghép, thay entry này bằng Home. Wildcard hiển thị không tìm thấy trang, không tự chuyển mọi đường dẫn về menu. Dùng một BrowserRouter tại entry chung, không lồng thêm router. Font Inter và theme đang import ở main.jsx; thống nhất theme với nhóm trước khi ghép giao diện.

Không ghi đè toàn bộ App.jsx/main.jsx của bạn làm home. Xem `frontend/README.md` để biết file phụ trách từng phần.

## Hợp đồng API khách hàng

Tiền tố `/api/cafe`; cookie HttpOnly `CAFE_SESSION`, header `X-Cafe-Client: web` cho POST/PUT. Gửi cookie cùng request. Mật khẩu đăng nhập không cần thiết cho luồng khách.

| Method | Path | Kết quả |
|---|---|---|
| GET | /context | Phiên bàn, cờ fixedTable |
| POST | /table-context | Xác nhận QR, hoặc bàn cố định khi chế độ demo bật |
| GET | /menu, /options | Món và chính sách tùy chọn |
| GET | /orders | Đơn thuộc phiên trình duyệt, tối đa 200 đơn mới nhất |
| POST | /orders | Tạo đơn, trả 201 và đơn đã lưu |
| PUT | /orders/{id} | Luôn từ chối sửa, trả 403 |
| POST | /orders/{id}/cancel | Hủy pending, yêu cầu reason và revision hiện tại |

Tạo đơn gửi tableId, note, requestKey và items (drinkId, quantity, size, sugar, ice, extras, note). Backend tự lấy giá; không tin giá frontend. Giữ requestKey khi thử lại sau lỗi mạng để tránh đơn trùng. `revision` trong kết quả GET/create là giá trị opaque, không tự tạo; khi hủy lỗi 409, tải lại đơn để xem trạng thái mới.

## Hợp đồng với serving và thanh toán

- Order ghi `orders`, `order_items`, tạo/dùng `table_sessions` OPEN; cập nhật bàn OCCUPIED. Không ghi payments, tồn kho hay doanh thu.
- Đơn mới: `order_source=QR_TABLE`, `fulfillment_type=DINE_IN`, `status=PENDING_CONFIRMATION`, `created_by_user_id=NULL`; các dòng món có `item_status=PENDING`.
- Serving tiếp nhận bằng cách khóa dòng orders trước, kiểm tra trạng thái, cập nhật orders và order_items nhất quán trong cùng transaction. Khi cạnh tranh với hủy, thao tác nào lấy khóa trước quyết định; thao tác sau phải đọc lại trạng thái. Không chỉ đổi item_status mà để orders vẫn pending.
- UI đọc lại mỗi 10 giây và hiển thị PENDING_CONFIRMATION → CONFIRMED → PREPARING → READY → COMPLETED, cùng CANCELLED/REJECTED. Backend order không cung cấp API giả để tiến trạng thái; phần đó do serving phụ trách.
- Hủy ghi cancel_reason/cancelled_at và CANCELLED cho cả đơn và dòng món. Không xóa lịch sử và không tự đóng phiên bàn/trả bàn AVAILABLE.
- Thanh toán phụ trách payments và kết thúc phiên. Order từ chối thêm đơn khi phiên PAYMENT_PENDING hoặc đã đóng. Các module cần thống nhất thứ tự khóa; xử lý retry khi MySQL phát hiện deadlock.
- Giá snapshot: subtotal = quantity × (unit_price + size_price + topping_price); topping_details là JSON [{name,price}]. Tổng order là tổng subtotal. Nhóm không tính cộng topping lần thứ hai.

Chưa kiểm thử tích hợp với code serving/thanh toán của các bạn khác; cần một buổi test chung sau khi merge nhánh review.

## Giới hạn Iter 1

- Quyền xem/hủy dựa trên phiên trình duyệt server (8 giờ). Mất cookie, hết phiên hoặc restart server có thể mất quyền xem lịch sử của khách; database vẫn giữ đơn. Chưa có tài khoản khách hoặc token khôi phục đa thiết bị.
- Tùy chọn size/topping đọc từ cấu hình backend vì schema freeze chưa có bảng catalog tương ứng. Không tự thêm bảng ngoài migration nhóm.
- Tên món lịch sử đọc từ menu_items; schema hiện không snapshot tên món.

## Kiểm thử và chuẩn bị commit

```sh
cd frontend
npm run build
```

Test backend chỉ dùng schema riêng `cafe_management_khoibm_test`, không dùng database demo/làm việc:

```sh
export TEST_DB_URL='jdbc:mysql://127.0.0.1:3306/cafe_management_khoibm_test?useSSL=false&allowPublicKeyRetrieval=true'
export TEST_DB_USER='root'
export TEST_DB_PASSWORD='your-local-test-password'
cd backend
mvn test
```

Không đặt TEST_DB_URL thì test MySQL bị bỏ qua; build xanh trong trường hợp đó không chứng minh database đã được test.

Trước khi push: xem `git diff --stat`, `git diff --check`, và diff staged. Chọn file cụ thể thay vì `git add .`. Đặc biệt, file mẫu Product `database/sample-data.sql` đang bị xóa từ trước: loại việc xóa này khỏi commit order nếu nhóm chưa chủ ý xóa. Không phục hồi tự động để tránh đè quyết định của người đang làm database. Không stage application-local.properties, .env, node_modules, target, dist, log hay dữ liệu MySQL.

Push nhánh riêng để review trước khi ghép nhánh chung. Agent chưa commit, push hoặc sửa lịch sử Git.
