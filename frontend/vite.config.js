import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'node:os'

const PORT = 5173

/**
 * Liệt kê các IP mạng LAN của máy (IPv4), xếp hạng để in vào mã QR bàn.
 * - Ưu tiên cao nhất: IP Mobile Hotspot của Windows (192.168.137.x) -> điện thoại bắt Wi-Fi phát từ máy tính.
 * - Sau đó: card Wi-Fi / Ethernet thật (192.168.x, 10.x, 172.16-31.x).
 * - Bỏ qua card ảo (Hyper-V/WSL/VMware/VirtualBox/Docker/VPN) vì điện thoại không tới được.
 * Lưu ý: Windows không nhận gói gửi tới IP của card mạng KHÁC (strong host), nên khi điện thoại bắt hotspot
 * của máy thì QR bắt buộc phải là IP hotspot, không phải IP Wi-Fi mà máy đang dùng để lên mạng.
 */
function detectLanIps() {
  const virtual = /(vethernet|virtual|vmware|vbox|wsl|hyper-v|docker|loopback|bluetooth|tailscale|zerotier|radmin|hamachi|vpn)/i
  const candidates = []
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family !== 'IPv4' && ni.family !== 4) continue
      if (ni.internal || ni.address.startsWith('169.254.')) continue
      let score = virtual.test(name) ? 0 : 10
      if (ni.address.startsWith('192.168.137.')) score += 20 // Windows Mobile Hotspot (ICS)
      else if (/(wi-?fi|wlan|wireless)/i.test(name)) score += 5
      if (ni.address.startsWith('192.168.')) score += 3
      else if (ni.address.startsWith('10.')) score += 2
      candidates.push({ name, address: ni.address, score })
    }
  }
  return candidates.sort((a, b) => b.score - a.score)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Backend chạy trên chính máy này; đổi cổng bằng VITE_BACKEND_URL trong .env nếu không phải 8080.
  const backend = env.VITE_BACKEND_URL || 'http://localhost:8080'
  const lanIps = detectLanIps()
  const lanOrigins = lanIps.map((c) => `http://${c.address}:${PORT}`)
  // Có thể ép địa chỉ dùng trong QR bằng VITE_PUBLIC_ORIGIN (vd http://192.168.137.1:5173).
  const lanOrigin = env.VITE_PUBLIC_ORIGIN || lanOrigins[0] || ''
  if (lanOrigin) {
    console.log(`\n  ➜  QR bàn sẽ dùng: ${lanOrigin}`)
    lanIps.forEach((c, i) => console.log(`     ${i === 0 ? '*' : ' '} ${c.name.padEnd(28)} http://${c.address}:${PORT}`))
    console.log('     (Điện thoại bắt hotspot của máy -> dùng 192.168.137.1. Sai thì đặt VITE_PUBLIC_ORIGIN trong .env)\n')
  }

  // Bỏ header Origin khi chuyển tiếp: backend thấy request như từ chính nó -> không bị chặn CORS dù IP là gì.
  const proxyTarget = {
    target: backend,
    changeOrigin: true,
    configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
  }

  return {
    plugins: [react()],
    define: {
      __LAN_ORIGIN__: JSON.stringify(lanOrigin),
      __LAN_ORIGINS__: JSON.stringify([...new Set([lanOrigin, ...lanOrigins].filter(Boolean))]),
    },
    server: {
      // host: true = nghe trên 0.0.0.0 -> điện thoại cùng mạng mở được http://<IP-máy>:5173
      host: true,
      port: PORT,
      strictPort: true,
      // open: '/' -> chạy "npm run dev" sẽ tự mở trình duyệt ở trang home của khách
      open: '/',
      proxy: { '/api': proxyTarget, '/uploads': proxyTarget },
    },
  }
})
