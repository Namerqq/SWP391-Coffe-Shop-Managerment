# 🚀 Fullstack Project – ReactJS + Spring Boot + MySQL

> Dự án mẫu (khung sườn) để cả nhóm cùng code. Đã có sẵn **1 module mẫu: Quản lý sản phẩm (Product) – CRUD đầy đủ**.
> Khi làm chức năng mới, chỉ cần **copy theo module Product** và đổi tên.

---

## 📑 Mục lục
1. [Công nghệ sử dụng](#1-công-nghệ-sử-dụng)
2. [Kiến trúc & luồng chạy](#2-kiến-trúc--luồng-chạy)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Nhiệm vụ từng phần](#4-nhiệm-vụ-từng-phần)
5. [Cài đặt & chạy dự án](#5-cài-đặt--chạy-dự-án)
6. [Danh sách API](#6-danh-sách-api)
7. [Hướng dẫn thêm 1 chức năng mới](#7-hướng-dẫn-thêm-1-chức-năng-mới)
8. [Quy trình làm việc với Git/GitHub](#8-quy-trình-làm-việc-với-gitgithub)
9. [Gợi ý phân chia công việc trong nhóm](#9-gợi-ý-phân-chia-công-việc-trong-nhóm)
10. [Lỗi thường gặp](#10-lỗi-thường-gặp)

---

## 1. Công nghệ sử dụng

| Phần | Công nghệ | Vai trò |
|---|---|---|
| Frontend | **ReactJS (Vite)** + **Bootstrap 5** + Axios + React Router | Giao diện người dùng |
| Backend | **Spring Boot 3 (Java 17)** + Spring Data JPA | Xử lý logic, cung cấp REST API |
| Database | **MySQL 8** + **MySQL Workbench** | Lưu trữ dữ liệu, quản lý DB bằng giao diện |
| Test API | **Postman** | Kiểm tra API trước khi ghép với frontend |
| Source code | **Git + GitHub** | Làm việc nhóm, quản lý phiên bản |

---

## 2. Kiến trúc & luồng chạy

```
┌──────────────┐   HTTP (JSON)   ┌───────────────────────────────┐   SQL   ┌─────────┐
│   FRONTEND   │ ──────────────▶ │           BACKEND             │ ──────▶ │  MySQL  │
│ React+Bootstrap│ ◀────────────── │ Controller → Service → Repo   │ ◀────── │   DB    │
│ localhost:5173 │   (response)    │        localhost:8080         │         │  :3306  │
└──────────────┘                 └───────────────────────────────┘         └─────────┘
        ▲                                        ▲
        │                                        │
     Người dùng                              Postman (test API)
```

### Luồng của 1 chức năng (ví dụ: bấm "Lưu" khi thêm sản phẩm)

1. **Người dùng** nhập form ở trang `ProductForm.jsx` rồi bấm **Lưu**.
2. Trang gọi `productApi.create(data)` (file `api/productApi.js`) → Axios gửi `POST http://localhost:8080/api/products`.
3. **Controller** (`ProductController`) nhận request, kiểm tra dữ liệu hợp lệ (`@Valid` + `ProductRequest`).
4. Controller giao cho **Service** (`ProductService`) xử lý logic.
5. Service gọi **Repository** (`ProductRepository`) → Hibernate/JPA sinh câu `INSERT` → lưu vào **MySQL**.
6. Kết quả đi ngược lại: Repository → Service → Controller → trả JSON (`ProductResponse`) về React.
7. React nhận response → chuyển về trang danh sách và hiển thị dữ liệu mới.

> 💡 **Quy tắc vàng:** mỗi tầng chỉ làm việc của tầng đó. Controller **không** viết logic, Service **không** xử lý HTTP, Repository **chỉ** làm việc với DB.

---

## 3. Cấu trúc thư mục

```
fullstack-project/
├── README.md                     ← Tài liệu này
├── .gitignore
│
├── backend/                      ← SPRING BOOT (Java)
│   ├── pom.xml                   ← Khai báo thư viện (Maven)
│   └── src/main/
│       ├── java/com/example/project/
│       │   ├── ProjectApplication.java   ← Điểm chạy của server
│       │   ├── config/           ← Cấu hình (CORS, ...)
│       │   ├── controller/       ← Nhận request HTTP, trả JSON
│       │   ├── service/          ← Logic nghiệp vụ
│       │   ├── repository/       ← Truy vấn database
│       │   ├── entity/           ← Class ánh xạ với bảng MySQL
│       │   ├── dto/              ← Dữ liệu vào/ra của API
│       │   └── exception/        ← Xử lý lỗi tập trung
│       └── resources/
│           └── application.properties    ← Cấu hình DB, port, CORS
│
├── frontend/                     ← REACTJS + BOOTSTRAP
│   ├── package.json              ← Khai báo thư viện (npm)
│   ├── vite.config.js
│   ├── .env.example              ← Mẫu biến môi trường
│   └── src/
│       ├── main.jsx              ← Điểm khởi động React
│       ├── App.jsx               ← Khai báo routes (URL → trang)
│       ├── api/                  ← Gọi backend (axios)
│       ├── components/           ← Thành phần giao diện dùng lại nhiều nơi
│       └── pages/                ← Mỗi file = 1 trang
│
├── database/
│   ├── schema.sql                ← Script tạo DB + bảng (chạy trong Workbench)
│   └── sample-data.sql           ← Dữ liệu mẫu
│
└── postman/
    └── Project.postman_collection.json   ← Import vào Postman để test API
```

---

## 4. Nhiệm vụ từng phần

### 🖥️ Frontend (`frontend/src`)
| Thư mục/File | Nhiệm vụ |
|---|---|
| `main.jsx` | Khởi động React, nạp Bootstrap CSS, bật React Router |
| `App.jsx` | Khai báo **đường dẫn URL → trang** |
| `pages/` | Mỗi trang lớn (danh sách, form, đăng nhập...). Chứa state + gọi API |
| `components/` | Các mảnh UI dùng lại (Navbar, Modal, Pagination...) |
| `api/axiosClient.js` | Cấu hình Axios **1 lần** (địa chỉ backend) |
| `api/productApi.js` | Mỗi hàm = 1 endpoint. **Page không tự viết URL**, chỉ gọi hàm ở đây |

### ⚙️ Backend (`backend/src/main/java/com/example/project`)
| Tầng | Nhiệm vụ | Ví dụ trong project |
|---|---|---|
| **Controller** | Nhận request, gắn URL (`@GetMapping`...), trả JSON | `ProductController` |
| **Service** | Viết logic nghiệp vụ (kiểm tra, tính toán, gọi nhiều repo) | `ProductService` |
| **Repository** | Làm việc với DB (`save`, `findAll`, `findById`...) | `ProductRepository` |
| **Entity** | Class = 1 bảng trong MySQL | `Product` |
| **DTO** | Hình dạng dữ liệu vào/ra API (không lộ toàn bộ entity) | `ProductRequest`, `ProductResponse` |
| **Exception** | Bắt lỗi tập trung, trả thông báo JSON dễ hiểu | `GlobalExceptionHandler` |
| **Config** | Cấu hình chung (CORS cho phép React gọi API) | `CorsConfig` |

### 🗄️ Database (`database/`)
- `schema.sql`: tạo database `project_db` và các bảng. Mở bằng **MySQL Workbench** và bấm ⚡ Execute.
- `sample-data.sql`: dữ liệu mẫu để test.
- Mọi thay đổi cấu trúc bảng → **cập nhật vào `schema.sql`** rồi commit để cả nhóm đồng bộ.

### 📮 Postman (`postman/`)
- Import file `Project.postman_collection.json` (Postman → Import).
- **Test API bằng Postman trước**, chạy đúng rồi mới nối vào React → dễ tìm lỗi (lỗi ở backend hay frontend?).

---

## 5. Cài đặt & chạy dự án

### Yêu cầu cài trước
- **JDK 17**, **Maven** (hoặc dùng Maven trong IntelliJ/VS Code)
- **Node.js 18+** (kèm npm)
- **MySQL 8** + **MySQL Workbench**
- **Git**, **Postman**

### Bước 1 – Clone project
```bash
git clone <link-repo-github>
cd fullstack-project
```

### Bước 2 – Tạo database
1. Mở **MySQL Workbench**, kết nối vào server local.
2. Mở `database/schema.sql` → bấm ⚡ **Execute**.
3. (Tuỳ chọn) Chạy `database/sample-data.sql` để có dữ liệu mẫu.

### Bước 3 – Chạy Backend
1. Mở `backend/src/main/resources/application.properties`, sửa **username/password MySQL** cho đúng máy bạn
   (hoặc đặt biến môi trường `DB_USER`, `DB_PASSWORD`).
2. Chạy:
```bash
cd backend
mvn spring-boot:run
```
   Hoặc mở IDE và chạy `ProjectApplication.java`.
3. Thấy log `Started ProjectApplication` → backend chạy tại **http://localhost:8080**.
4. Thử nhanh: mở trình duyệt vào http://localhost:8080/api/products.

### Bước 4 – Chạy Frontend
```bash
cd frontend
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm run dev
```
Mở **http://localhost:5173**.

### Bước 5 – Test API bằng Postman
Import `postman/Project.postman_collection.json` → chạy thử các request.

---

## 6. Danh sách API

Base URL: `http://localhost:8080/api`

| Method | Endpoint | Mô tả | Body |
|---|---|---|---|
| GET | `/products` | Lấy tất cả (có thể `?keyword=abc` để tìm) | – |
| GET | `/products/{id}` | Lấy 1 sản phẩm | – |
| POST | `/products` | Thêm mới → `201 Created` | JSON |
| PUT | `/products/{id}` | Cập nhật | JSON |
| DELETE | `/products/{id}` | Xóa → `204 No Content` | – |

**Body mẫu (POST/PUT):**
```json
{
  "name": "Tai nghe",
  "price": 450000,
  "quantity": 15,
  "description": "Chống ồn"
}
```

**Mã lỗi:** `400` dữ liệu sai (trả về từng field lỗi) · `404` không tìm thấy id.

> ⚠️ Khi thêm API mới, **nhớ cập nhật bảng này** và thêm request vào collection Postman.

---

## 7. Hướng dẫn thêm 1 chức năng mới

Ví dụ muốn thêm module **Category** – làm theo thứ tự (copy từ Product):

**Backend**
1. `entity/Category.java` (+ thêm bảng vào `database/schema.sql`)
2. `repository/CategoryRepository.java`
3. `dto/CategoryRequest.java`, `dto/CategoryResponse.java`
4. `service/CategoryService.java`
5. `controller/CategoryController.java`
6. Test bằng **Postman** ✅

**Frontend**
7. `api/categoryApi.js`
8. `pages/CategoryList.jsx`, `pages/CategoryForm.jsx`
9. Thêm route vào `App.jsx` và link vào `AppNavbar.jsx`

**Checklist trước khi tạo Pull Request**
- [ ] Backend chạy không lỗi
- [ ] Đã test API bằng Postman
- [ ] Giao diện chạy đúng, không lỗi console (F12)
- [ ] Đã cập nhật `schema.sql` / bảng API trong README (nếu có thay đổi)
- [ ] Không commit mật khẩu, `node_modules`, `target`

---

## 8. Quy trình làm việc với Git/GitHub

### Nhánh (branch)
```
main      ← Code ổn định, chạy được. KHÔNG code trực tiếp
 └── develop   ← Nhánh tổng hợp của cả nhóm
       ├── feature/product-crud
       ├── feature/login
       └── fix/loi-hien-thi-gia
```

### Quy trình mỗi lần làm việc
```bash
# 1. Lấy code mới nhất
git checkout develop
git pull origin develop

# 2. Tạo nhánh riêng cho việc mình làm
git checkout -b feature/ten-chuc-nang

# 3. Code... rồi commit thường xuyên
git add .
git commit -m "feat: thêm API tìm kiếm sản phẩm"

# 4. Đẩy lên GitHub
git push origin feature/ten-chuc-nang

# 5. Lên GitHub tạo Pull Request (feature/... → develop), nhờ bạn review rồi Merge
```

### Quy ước đặt tên commit
| Tiền tố | Dùng khi |
|---|---|
| `feat:` | Thêm chức năng mới |
| `fix:` | Sửa lỗi |
| `docs:` | Sửa tài liệu/README |
| `style:` | Chỉnh giao diện, format code |
| `refactor:` | Sắp xếp lại code, không đổi chức năng |

### Lưu ý để tránh xung đột (conflict)
- **Luôn `git pull` trước khi bắt đầu code.**
- Mỗi người làm **1 module/1 nhánh riêng**, hạn chế cùng sửa 1 file.
- File hay bị đụng nhau: `App.jsx`, `AppNavbar.jsx`, `schema.sql` → sửa nhỏ, commit sớm, báo nhóm.
- **Không** commit: mật khẩu DB, `node_modules/`, `target/`, `.env` (đã có trong `.gitignore`).

---

## 9. Gợi ý phân chia công việc trong nhóm

| Vai trò | Việc chính | Thư mục làm việc |
|---|---|---|
| **Backend dev** | Viết Entity, Repository, Service, Controller | `backend/` |
| **Frontend dev** | Làm giao diện, gọi API, validate form | `frontend/` |
| **Database + Tester** | Thiết kế bảng, viết `schema.sql`, test API bằng Postman | `database/`, `postman/` |
| **Trưởng nhóm / Git master** | Review Pull Request, merge, giữ `main` ổn định | GitHub |

> Nhóm nhỏ thì 1 người có thể kiêm nhiều vai. Cách chia hiệu quả nhất: **chia theo chức năng** (mỗi người làm trọn 1 module từ DB → API → giao diện) hoặc **chia theo tầng** (backend/frontend) với hợp đồng API thống nhất ở mục 6.

---

## 10. Lỗi thường gặp

| Lỗi | Nguyên nhân & cách sửa |
|---|---|
| `Access denied for user 'root'` | Sai user/password trong `application.properties` |
| `Unknown database 'project_db'` | Chưa chạy `database/schema.sql` trong Workbench |
| Port 8080 đã được dùng | Đổi `server.port` trong `application.properties` (và `VITE_API_URL` bên frontend) |
| Frontend báo `Network Error` / CORS | Backend chưa chạy, hoặc frontend không chạy ở `localhost:5173` (sửa `app.cors.allowed-origins`) |
| `npm install` lỗi | Kiểm tra Node.js ≥ 18, thử xóa `node_modules` rồi cài lại |
| Tiếng Việt bị lỗi font trong DB | Tạo DB với `utf8mb4` (đã có sẵn trong `schema.sql`) |
| Sửa `.env` không ăn | Tắt `npm run dev` rồi chạy lại |

---

## 🤝 Đóng góp
Mọi thắc mắc cứ tạo **Issue** trên GitHub hoặc hỏi trong nhóm. Chúc cả nhóm code vui! 🎉
