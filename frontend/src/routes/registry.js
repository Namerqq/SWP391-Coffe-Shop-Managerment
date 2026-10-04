// Gộp cấu hình điều hướng của các thành viên. Mỗi người CHỈ sửa file *Nav.js / *Routes.jsx của mình,
// nên khi merge trên GitHub không bị conflict.
import { danmtNav, danmtHomes } from './danmtNav'
import { thangnnNav, thangnnHomes } from './thangnnNav'
import { khoibmNav, khoibmHomes } from './khoibmNav'

/** Gộp menu trái theo vai trò: cùng 1 vai trò thì nối danh sách mục của các thành viên lại. */
function mergeNav(...navs) {
  const out = {}
  navs.forEach((nav) => {
    Object.entries(nav).forEach(([role, cfg]) => {
      const cur = out[role] || { subtitle: '', items: [] }
      out[role] = { subtitle: cur.subtitle || cfg.subtitle || '', items: [...cur.items, ...(cfg.items || [])] }
    })
  })
  return out
}

/** { BARISTA: { subtitle, items: [{ to, label, icon, end }] }, ... } */
export const roleNav = mergeNav(thangnnNav, danmtNav, khoibmNav)

const roleHomes = { ADMIN: '/admin', ...danmtHomes, ...thangnnHomes, ...khoibmHomes }

/** Trang mặc định sau khi đăng nhập. Vai trò chưa có màn hình -> /home (trang tạm). */
export const homeOf = (user) => roleHomes[user?.roleName] || '/home'
