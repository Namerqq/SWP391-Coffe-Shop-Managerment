import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import adminApi from '../../api/adminApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import { formatDateTime } from '../../utils/format'
import { assetUrl } from '../../utils/assetUrl'

const GROUPS = [
  { key: 'GENERAL', label: 'Thông tin quán', icon: 'bi-shop' },
  { key: 'SALES', label: 'Bán hàng & tích điểm', icon: 'bi-receipt' },
  { key: 'SECURITY', label: 'Bảo mật', icon: 'bi-shield-lock' },
  { key: 'HOME', label: 'Trang chủ', icon: 'bi-house' },
]

// Nhóm HOME: key "home.<khu>.<trường>" -> tiêu đề khu trên trang chủ
const HOME_SECTIONS = {
  brand: 'Thương hiệu & logo',
  hero1: 'Banner 1', hero2: 'Banner 2', hero3: 'Banner 3',
  feature1: 'Khối giới thiệu 1', feature2: 'Khối giới thiệu 2', feature3: 'Khối giới thiệu 3',
  origin: 'Nguồn gốc',
  services: 'Dịch vụ', service1: 'Dịch vụ 1', service2: 'Dịch vụ 2', service3: 'Dịch vụ 3',
  store: 'Địa chỉ quán', contact: 'Liên hệ hỗ trợ',
}
const homeSection = (s) => (s?.groupName === 'HOME' ? s.key.split('.')[1] : null)

/** Ô chọn ảnh: tải ảnh lên server rồi gán đường dẫn vào cấu hình (bấm Lưu thay đổi để áp dụng). */
function ImageInput({ id, value, onChange }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('Ảnh quá lớn, tối đa 5MB.', 'error')
      return
    }
    setUploading(true)
    try {
      const res = await adminApi.uploadImage(file)
      onChange(res.data.url)
      toast('Đã tải ảnh lên. Bấm "Lưu thay đổi" để áp dụng.')
    } catch (err) {
      toast(errorMessage(err, 'Tải ảnh thất bại.'), 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="img-setting">
      <div className="img-setting-preview">
        {value ? <img src={assetUrl(value)} alt="Ảnh đang dùng" /> : <i className="bi bi-image" aria-hidden="true" />}
      </div>
      <div className="d-flex flex-wrap gap-2">
        <input ref={fileRef} id={id} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={pick} />
        <button type="button" className="btn btn-light-soft btn-sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-upload me-1" />}
          {value ? 'Đổi ảnh' : 'Tải ảnh lên'}
        </button>
        {value && (
          <button type="button" className="btn btn-light-soft btn-sm" onClick={() => onChange('')}>
            <i className="bi bi-x-lg me-1" />Bỏ ảnh
          </button>
        )}
      </div>
    </div>
  )
}

// UC-AD06 Configure System Settings
export default function SystemSettings() {
  const toast = useToast()
  const [settings, setSettings] = useState([])
  const [values, setValues] = useState({})
  const [tab, setTab] = useState('GENERAL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const apply = (list) => {
    setSettings(list)
    setValues(Object.fromEntries(list.map((s) => [s.key, s.value])))
  }

  useEffect(() => {
    adminApi.getSettings()
      .then((res) => apply(res.data))
      .catch((e) => setError(errorMessage(e, 'Không tải được cấu hình. Đã chạy database/V3, V4 chưa?')))
      .finally(() => setLoading(false))
  }, [])

  const changed = useMemo(
    () => Object.fromEntries(settings.filter((s) => values[s.key] !== s.value).map((s) => [s.key, values[s.key]])),
    [settings, values]
  )
  const dirtyCount = Object.keys(changed).length
  const dirtyIn = (group) => settings.some((s) => s.groupName === group && s.key in changed)

  const save = async () => {
    setSaving(true)
    try {
      const res = await adminApi.updateSettings(changed)
      apply(res.data)
      toast('Đã lưu cài đặt hệ thống')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  const set = (key, v) => setValues((old) => ({ ...old, [key]: v }))

  const renderInput = (s) => {
    const v = values[s.key] ?? ''
    const id = `s-${s.key}`
    switch (s.dataType) {
      case 'BOOLEAN':
        return (
          <div className="form-check form-switch m-0">
            <input id={id} className="form-check-input" type="checkbox" role="switch" checked={v === 'true'}
                   onChange={(e) => set(s.key, e.target.checked ? 'true' : 'false')} />
            <label className="form-check-label small cf-muted ms-1" htmlFor={id}>{v === 'true' ? 'Đang bật' : 'Đang tắt'}</label>
          </div>
        )
      case 'NUMBER':
        return <input id={id} type="number" min="0" className="form-control" value={v} onChange={(e) => set(s.key, e.target.value)} />
      case 'TIME':
        return <input id={id} type="time" className="form-control" value={v} onChange={(e) => set(s.key, e.target.value)} />
      case 'EMAIL':
        return <input id={id} type="email" className="form-control" value={v} onChange={(e) => set(s.key, e.target.value)} />
      case 'URL':
        return <input id={id} type="url" className="form-control" placeholder="https://..." value={v} onChange={(e) => set(s.key, e.target.value)} />
      case 'TEXT':
        return <textarea id={id} className="form-control" rows={3} maxLength={500} value={v} onChange={(e) => set(s.key, e.target.value)} />
      case 'IMAGE':
        return <ImageInput id={id} value={v} onChange={(url) => set(s.key, url)} />
      default:
        return <input id={id} className="form-control" maxLength={500} value={v} onChange={(e) => set(s.key, e.target.value)} />
    }
  }

  const visible = settings.filter((s) => s.groupName === tab)

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title">Cài đặt hệ thống</h1>
          <p className="page-subtitle">Cấu hình chung áp dụng cho toàn bộ hệ thống quán và trang chủ khách hàng.</p>
        </div>
        <div className="d-flex gap-2">
          {dirtyCount > 0 && (
            <button className="btn btn-light-soft" disabled={saving} onClick={() => apply(settings)}>Hoàn tác</button>
          )}
          <button className="btn btn-primary" disabled={dirtyCount === 0 || saving} onClick={save}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}
            Lưu thay đổi{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="cf-card">
        <div className="cf-tabs px-3" role="tablist">
          {GROUPS.map((g) => (
            <button key={g.key} role="tab" aria-selected={tab === g.key} className={tab === g.key ? 'active' : ''} onClick={() => setTab(g.key)}>
              <i className={`bi ${g.icon} me-2`} />{g.label}
              {dirtyIn(g.key) && <span className="ms-2 d-inline-block rounded-circle" style={{ width: 6, height: 6, background: 'var(--cf-primary)', verticalAlign: 'middle' }} />}
            </button>
          ))}
        </div>

        {tab === 'HOME' && (
          <div className="settings-note mx-4 mt-3">
            <i className="bi bi-info-circle" />
            <span>
              Nội dung trang chủ dành cho khách. Ảnh tải lên được lưu trên máy chủ ngay, nhưng chỉ hiện trên trang chủ
              sau khi bấm <strong>Lưu thay đổi</strong>.{' '}
              <a href="/" target="_blank" rel="noreferrer">Mở trang chủ</a>
            </span>
          </div>
        )}

        <div className="px-4">
          {loading && <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>}
          {!loading && visible.length === 0 && !error && (
            <div className="empty-state">Chưa có cấu hình nào trong nhóm này. Hãy chạy database/V4__home_and_payment_settings.sql.</div>
          )}
          {visible.map((s, i) => {
            const section = homeSection(s)
            const newSection = section && section !== homeSection(visible[i - 1])
            return (
              <Fragment key={s.key}>
                {newSection && <div className="setting-section">{HOME_SECTIONS[section] || section}</div>}
                <div className="setting-row">
                  <div>
                    <label className="fw-semibold" htmlFor={`s-${s.key}`} style={{ fontSize: '0.925rem' }}>
                      {s.label}
                      {s.key in changed && <span className="cf-badge badge-role ms-2" style={{ fontSize: '0.7rem' }}>Đã sửa</span>}
                    </label>
                    {s.description && <div className="form-text mt-1">{s.description}</div>}
                    {s.updatedBy && (
                      <div className="form-text mt-1" style={{ fontSize: '0.75rem' }}>
                        Cập nhật bởi {s.updatedBy} · {formatDateTime(s.updatedAt)}
                      </div>
                    )}
                  </div>
                  <div>{renderInput(s)}</div>
                </div>
              </Fragment>
            )
          })}
        </div>
      </div>
    </>
  )
}
