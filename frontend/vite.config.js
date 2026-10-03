import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // open: '/' -> chạy "npm run dev" sẽ tự mở trình duyệt ở trang home của khách
  server: { port: 5173, open: '/' },
})
