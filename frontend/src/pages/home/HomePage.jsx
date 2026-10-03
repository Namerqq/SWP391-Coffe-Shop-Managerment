import { useEffect, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { assetUrl } from '../../utils/assetUrl'

/** Ảnh do Admin tải lên; chưa có ảnh thì hiện nền họa tiết gạch. */
function Photo({ src, alt, icon, className = '' }) {
  if (src) return <img className={`gc-photo ${className}`} src={assetUrl(src)} alt={alt} loading="lazy" />
  return (
    <div className={`gc-photo gc-photo-empty ${className}`} role="img" aria-label={alt}>
      <i className={`bi ${icon}`} />
    </div>
  )
}

const FEATURE_ICONS = ['bi-cup-hot', 'bi-flower1', 'bi-snow']
const SERVICE_ICONS = ['bi-shop', 'bi-bag-check', 'bi-scooter']

function HeroSlider({ content }) {
  const slides = [1, 2, 3].map((n) => ({
    image: content[`home.hero${n}.image`],
    title: content[`home.hero${n}.title`],
    subtitle: content[`home.hero${n}.subtitle`],
  }))
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (paused || reduceMotion) return undefined
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), 6000)
    return () => clearTimeout(t)
  }, [index, paused, reduceMotion, slides.length])

  const go = (d) => setIndex((i) => (i + d + slides.length) % slides.length)

  return (
    <section className="gc-hero" aria-roledescription="carousel" aria-label="Giới thiệu"
             onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
             onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {slides.map((s, i) => (
        <div key={i} className={`gc-slide ${i === index ? 'active' : ''} ${s.image ? '' : 'gc-slide-empty'}`}
             aria-hidden={i !== index}
             style={s.image ? { backgroundImage: `url("${assetUrl(s.image)}")` } : undefined}>
          <div className="gc-container gc-slide-content">
            {s.title && <h1>{s.title}</h1>}
            {s.subtitle && <p>{s.subtitle}</p>}
            <div className="gc-actions">
              <Link to="/thuc-don" className="gc-btn gc-btn-light" tabIndex={i === index ? 0 : -1}>Xem thực đơn</Link>
              <Link to="/dat-hang-online" className="gc-btn gc-btn-ghost-light" tabIndex={i === index ? 0 : -1}>Đặt hàng online</Link>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="gc-hero-arrow prev" onClick={() => go(-1)} aria-label="Banner trước">
        <i className="bi bi-chevron-left" />
      </button>
      <button type="button" className="gc-hero-arrow next" onClick={() => go(1)} aria-label="Banner sau">
        <i className="bi bi-chevron-right" />
      </button>
      <div className="gc-hero-dots">
        {slides.map((_, i) => (
          <button type="button" key={i} className={i === index ? 'active' : ''} onClick={() => setIndex(i)}
                  aria-label={`Banner ${i + 1}`} aria-current={i === index} />
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const { content } = useOutletContext()
  const location = useLocation()
  const c = (k) => content[k] || ''
  const brand = c('home.brand.name') || 'Gạch Coffee'
  const address = c('home.store.address')
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : ''

  // Đến từ trang khác qua menu "Về ..." -> cuộn tới khu được chọn.
  useEffect(() => {
    const id = location.state?.scrollTo
    if (!id) return undefined
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    return () => clearTimeout(t)
  }, [location.state])

  return (
    <>
      <HeroSlider content={content} />

      <section className="gc-section">
        <div className="gc-container gc-features">
          {[1, 2, 3].map((n, i) => (
            <article key={n} className={`gc-feature ${i % 2 === 1 ? 'reverse' : ''}`}>
              <Photo src={c(`home.feature${n}.image`)} alt={c(`home.feature${n}.title`)} icon={FEATURE_ICONS[i]} className="gc-feature-photo" />
              <div className="gc-feature-body">
                <h2>{c(`home.feature${n}.title`)}</h2>
                <p>{c(`home.feature${n}.desc`)}</p>
                <Link to="/thuc-don" className="gc-btn gc-btn-primary">Xem món trong thực đơn</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="nguon-goc" className="gc-section gc-section-soft gc-anchor">
        <div className="gc-container gc-story">
          <div className="gc-story-body">
            <h2>{c('home.origin.title')}</h2>
            {c('home.origin.content').split('\n').filter((p) => p.trim()).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <Photo src={c('home.origin.image')} alt={c('home.origin.title')} icon="bi-book" className="gc-story-photo" />
        </div>
      </section>

      <section id="dich-vu" className="gc-section gc-anchor">
        <div className="gc-container">
          <h2 className="gc-section-title">{c('home.services.heading')}</h2>
          <div className="gc-services">
            {[1, 2, 3].map((n, i) => (
              <div key={n} className="gc-service">
                <i className={`bi ${SERVICE_ICONS[i]} gc-service-icon`} aria-hidden="true" />
                <h3>{c(`home.service${n}.title`)}</h3>
                <p>{c(`home.service${n}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gc-section gc-section-soft">
        <div className="gc-container gc-visit">
          <Photo src={c('home.store.image')} alt={`Quán ${brand}`} icon="bi-shop" className="gc-visit-photo" />
          <div className="gc-visit-body">
            <div id="dia-chi" className="gc-anchor">
              <h2>{c('home.store.title')}</h2>
              <p className="gc-line"><i className="bi bi-geo-alt" /> {address || 'Địa chỉ đang được cập nhật.'}</p>
              {c('home.store.hours') && <p className="gc-line"><i className="bi bi-clock" /> {c('home.store.hours')}</p>}
              {mapUrl && <a className="gc-link" href={mapUrl} target="_blank" rel="noreferrer">Mở bản đồ chỉ đường</a>}
            </div>
            <div id="lien-he" className="gc-anchor gc-contact">
              <h3>{c('home.contact.title')}</h3>
              {c('home.contact.hotline') && (
                <a className="gc-line" href={`tel:${c('home.contact.hotline').replace(/\s/g, '')}`}><i className="bi bi-telephone" /> {c('home.contact.hotline')}</a>
              )}
              {c('home.contact.email') && (
                <a className="gc-line" href={`mailto:${c('home.contact.email')}`}><i className="bi bi-envelope" /> {c('home.contact.email')}</a>
              )}
              {c('home.contact.facebook') && (
                <a className="gc-line" href={c('home.contact.facebook')} target="_blank" rel="noreferrer"><i className="bi bi-facebook" /> Fanpage {brand}</a>
              )}
              {!c('home.contact.hotline') && !c('home.contact.email') && !c('home.contact.facebook') && (
                <p className="gc-line gc-muted">Thông tin liên hệ đang được cập nhật.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
