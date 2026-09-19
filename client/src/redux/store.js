import { configureStore } from "@reduxjs/toolkit";

/**
 * redux/
 * Cấu hình redux (nếu có) cho toàn bộ ứng dụng.
 * Ví dụ: import thêm reducer của user, auth,... vào đây.
 */
export const store = configureStore({
  reducer: {
    // user: userReducer,
  },
});
