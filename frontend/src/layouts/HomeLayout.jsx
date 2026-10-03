import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import publicApi from '../api/publicApi'
import { assetUrl } from '../utils/assetUrl'
import { ABOUT_SECTIONS, DEFAULT_HOME } from '../pages/home/homeDefaults'
import '../styles/home.css'

/** Cờ Việt Nam mặc định (khi Admin chưa tải "Logo Việt Nam"). */
function VnFlag() {
  return (
    <svg viewBox="0 0 30 20" width="30" height="20" role="img" aria-label="Việt Nam">
      <rect width="30" height="20" rx="2" fill="#DA251D" />
      <polygon fill="#FFDD00" points="15,4 16.35,8.15 20.71,8.15 17.18,10.71 18.53,14.85 15,12.29 11.47,14.85 12.82,10.71 9.29,8.15 13.65,8.15" />
    </svg>
  )
}

/** Logo: ảnh Admin tải lên, nếu chưa có thì hiện logo chữ với họa tiết gạch. */
export function BrandLogo({ content, size = 'md' }) {
  const name = content['home.brand.name'] || 'Gạch Coffee'
  if (content['home.brand.logo']) {
    return <img src={assetUrl(content['home.brand.logo'])} alt={name} className={`gc-logo-img ${size}`} />
  }
  const [first, ...rest] = name.split(' ')
  return (
    <span className={`gc-logo-text ${size}`}>
      <span className="gc-brick-mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="gc-logo-words">
        <b>{first}</b>
        {rest.length > 0 && <small>{rest.join(' ')}</small>}
      </span>
    </span>
  )
}

export default function HomeLayout() {
  const [content, setContent] = useState(DEFAULT_HOME)
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const aboutRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Nội dung do Admin chỉnh ở Cài đặt hệ thống > Trang chủ. Backend chưa chạy -> dùng nội dung mặc định.
  useEffect(() => {
    publicApi.getHome().then((res) => setContent({ ...DEFAULT_HOME, ...res.data })).catch(() => {})
  }, [])

  // Đổi trang: đóng menu, cuộn lên đầu (trừ khi đang cần cuộn tới 1 khu của trang chủ).
  useEffect(() => {
    setMenuOpen(false)
    setAboutOpen(false)
    if (!location.state?.scrollTo) window.scrollTo(0, 0)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!aboutOpen) return undefined
    const close = (e) => { if (aboutRef.current && !aboutRef.current.contains(e.target)) setAboutOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setAboutOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [aboutOpen])

  const brand = content['home.brand.name'] || 'Gạch Coffee'

  // Tiêu đề tab trình duyệt của trang khách; rời trang khách thì trả lại tiêu đề hệ thống quản lý.
  useEffect(() => {
    const previous = document.title
    document.title = brand
    return () => { document.title = previous }
  }, [brand])

  /** Mục trong "Về ...": cuộn tới khu tương ứng trên trang chủ. */
  const goSection = (id) => {
    setAboutOpen(false)
    setMenuOpen(false)
    if (location.pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else navigate('/', { state: { scrollTo: id } })
  }

  const vnLogo = content['home.brand.vn_logo']
    ? <img src={assetUrl(content['home.brand.vn_logo'])} alt="Việt Nam" className="gc-vn-img" />
    : <VnFlag />

  return (
    <div className="gc-site">
      <header className={`gc-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="gc-header-inner">
          <div className="gc-side">
            <button type="button" className="gc-burger" onClick={() => setMenuOpen((o) => !o)}
                    aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen}>
              <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} />
            </button>
            <nav className="gc-nav" aria-label="Điều hướng chính">
              <NavLink to="/thuc-don" className="gc-nav-link">Thực đơn</NavLink>
              <div className="gc-dropdown" ref={aboutRef}>
                <button type="button" className={`gc-nav-link ${aboutOpen ? 'open' : ''}`} aria-haspopup="true"
                        aria-expanded={aboutOpen} onClick={() => setAboutOpen((o) => !o)}>
                  Về {brand} <i className="bi bi-chevron-down" />
                </button>
                {aboutOpen && (
                  <div className="gc-dropdown-menu" role="menu">
                    {ABOUT_SECTIONS.map((s) => (
                      <button type="button" role="menuitem" key={s.id} onClick={() => goSection(s.id)}>
                        <i className={`bi ${s.icon}`} /> {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          <Link to="/" className="gc-logo" aria-label={`${brand} - Trang chủ`}>
            <BrandLogo content={content} />
          </Link>

          <div className="gc-side gc-side-right">
            <Link to="/dat-hang-online" className="gc-order-link"><i className="bi bi-bag" /> <span>Đặt hàng online</span></Link>
            <span className="gc-vn" title="Việt Nam">{vnLogo}</span>
          </div>
        </div>

        {menuOpen && (
          <nav className="gc-mobile-menu" aria-label="Menu">
            <Link to="/thuc-don">Thực đơn</Link>
            <div className="gc-mobile-group">Về {brand}</div>
            {ABOUT_SECTIONS.map((s) => (
              <button type="button" key={s.id} onClick={() => goSection(s.id)}><i className={`bi ${s.icon}`} /> {s.label}</button>
            ))}
            <Link to="/dat-hang-online" className="gc-btn gc-btn-primary mt-2"><i className="bi bi-bag" /> Đặt hàng online</Link>
          </nav>
        )}
      </header>

      <main className="gc-main">
        <Outlet context={{ content }} />
      </main>

      <footer className="gc-footer">
        <div className="gc-container gc-footer-grid">
          <div>
            <BrandLogo content={content} size="sm" />
            {content['home.brand.tagline'] && <p className="gc-footer-tagline">{content['home.brand.tagline']}</p>}
          </div>
          <div>
            <h4>Về {brand}</h4>
            {ABOUT_SECTIONS.map((s) => (
              <button type="button" key={s.id} className="gc-footer-link" onClick={() => goSection(s.id)}>{s.label}</button>
            ))}
          </div>
          <div>
            <h4>Liên hệ</h4>
            {content['home.store.address'] && <p><i className="bi bi-geo-alt" /> {content['home.store.address']}</p>}
            {content['home.contact.hotline'] && <p><i className="bi bi-telephone" /> {content['home.contact.hotline']}</p>}
            {content['home.contact.email'] && <p><i className="bi bi-envelope" /> {content['home.contact.email']}</p>}
            {content['home.store.hours'] && <p><i className="bi bi-clock" /> {content['home.store.hours']}</p>}
          </div>
        </div>
        <div className="gc-container gc-footer-bottom">© {new Date().getFullYear()} {brand}</div>
      </footer>
    </div>
  )
}
