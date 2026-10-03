import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import baristaApi from '../../api/baristaApi'
import { errorMessage } from '../../api/axiosClient'

const splitLines = (text, sep) => (text || '').split(sep).map((s) => s.trim()).filter(Boolean)

/** Công thức của 1 món (nguyên liệu + cách pha) để Pha chế xem nhanh khi pha. */
export default function RecipeModal({ target, onClose }) {
  const [recipe, setRecipe] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!target) return
    setRecipe(null)
    setError('')
    baristaApi.getRecipe(target.menuItemId)
      .then((res) => setRecipe(res.data))
      .catch((e) => setError(errorMessage(e, 'Không tải được công thức.')))
  }, [target])

  if (!target) return null
  const ingredients = splitLines(recipe?.ingredients, /[;\n]/)
  const steps = splitLines(recipe?.instructions, /\n/)

  return (
    <Modal show title={`Công thức: ${target.itemName}`} onClose={onClose}
           footer={<button type="button" className="btn btn-light-soft" onClick={onClose}>Đóng</button>}>
      {!recipe && !error && <div className="empty-state py-3"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>}
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {recipe && ingredients.length === 0 && steps.length === 0 && (
        <div className="empty-state py-3">Món này chưa có công thức. Quản lý cập nhật trong Quản lý thực đơn.</div>
      )}
      {ingredients.length > 0 && (
        <>
          <div className="fw-semibold mb-2">Nguyên liệu</div>
          <ul className="recipe-list">{ingredients.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </>
      )}
      {steps.length > 0 && (
        <>
          <div className="fw-semibold mb-2 mt-3">Cách pha</div>
          <ol className="recipe-list">{steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
        </>
      )}
    </Modal>
  )
}
