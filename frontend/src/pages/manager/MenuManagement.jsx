import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api/menuManagementApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import ConfirmModal from '../../components/ConfirmModal'
import Modal from '../../components/Modal'
import MenuStats from '../../components/menu/MenuStats'
import MenuItemCard from '../../components/menu/MenuItemCard'
import MenuItemModal from './MenuItemModal'
import MenuCategoryModal from './MenuCategoryModal'
import { searchText, categoryTypes } from '../../utils/menuFormat'
import '../../styles/menu-management.css'

export default function MenuManagement() {
  const [data,setData] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState('')
  const [search,setSearch] = useState(''), [filter,setFilter] = useState('all')
  const [itemModal,setItemModal] = useState(null), [categoryModal,setCategoryModal] = useState(null)
  const [manageCategories,setManageCategories] = useState(false), [deleting,setDeleting] = useState(null), [busy,setBusy] = useState(null)
  const toast = useToast()
  const load = useCallback(async()=>{setLoading(true);setError('');try {setData((await api.catalog()).data)}catch(e){setError(errorMessage(e))}finally{setLoading(false)}},[])
  useEffect(()=>{load()},[load])
  const categories = data?.categories || []
  const filtered = useMemo(()=>(data?.items || []).filter(m=>(filter==='all'||m.categoryId===filter) && searchText(m.name).includes(searchText(search))),[data,filter,search])
  async function toggle(item) {setBusy(item.id);try {await api.availability(item.id,item.availabilityStatus!=='AVAILABLE');await load();toast('Đã cập nhật trạng thái bán.')}catch(e){toast(errorMessage(e),'error')}finally{setBusy(null)}}
  async function remove() {setBusy('delete');try {if(deleting.kind==='item') await api.deleteItem(deleting.value.id);else {await api.deleteCategory(deleting.value.id);if(filter===deleting.value.id)setFilter('all')};setDeleting(null);await load();toast('Đã xoá.')}catch(e){toast(errorMessage(e),'error')}finally{setBusy(null)}}
  function saved(kind) {if(kind==='item')setItemModal(null);else setCategoryModal(null);load();toast('Đã lưu thành công.')}
  return <div className="mm-page">
    <header className="mm-header"><div><span className="mm-eyebrow">Quản lý</span><h1>Menu món</h1></div><div className="mm-header-actions"><button className="btn btn-light-soft" onClick={()=>setCategoryModal({})}><i className="bi bi-folder-plus" /> Thêm danh mục</button><button className="btn btn-primary" onClick={()=>setItemModal({})} disabled={!categories.length}><i className="bi bi-plus-lg" /> Thêm món</button></div></header>
    {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-sm btn-light" onClick={load}>Thử lại</button></div>}
    {data && <MenuStats stats={data.stats} />}
    <div className="mm-filter-bar"><div className="mm-category-tabs" role="group" aria-label="Lọc danh mục"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Tất cả <span>{data?.items.length || 0}</span></button>{categories.map(c=><button key={c.id} className={filter===c.id?'active':''} onClick={()=>setFilter(c.id)}>{c.name} <span>{c.itemCount}</span></button>)}</div><button className="btn btn-light-soft" onClick={()=>setManageCategories(true)}><i className="bi bi-pencil-square" /> Quản lý danh mục</button></div>
    <div className="mm-search"><i className="bi bi-search" /><input aria-label="Tìm món" placeholder="Tìm món…" value={search} onChange={e=>setSearch(e.target.value)} />{search && <button aria-label="Xoá tìm kiếm" onClick={()=>setSearch('')}><i className="bi bi-x-lg" /></button>}</div>
    {loading ? <div className="mm-empty" role="status">Đang tải menu…</div> : !error && (!filtered.length ? <div className="mm-empty"><i className="bi bi-cup-hot" /><h2>{data?.items.length?'Không tìm thấy món':'Menu chưa có món'}</h2><p>{data?.items.length?'Thử từ khoá hoặc danh mục khác.':'Thêm danh mục và món đầu tiên để bắt đầu.'}</p></div> : <div className="mm-grid">{filtered.map(m=><MenuItemCard key={`${m.id}-${m.imageUrl}`} item={m} category={categories.find(c=>c.id===m.categoryId)} busy={busy===m.id} onEdit={()=>setItemModal(m)} onDelete={()=>setDeleting({kind:'item',value:m})} onToggle={()=>toggle(m)} />)}</div>)}
    {itemModal && <MenuItemModal item={itemModal.id?itemModal:null} categories={categories} initialCategory={filter==='all'?undefined:filter} onClose={()=>setItemModal(null)} onSaved={()=>saved('item')} />}
    {manageCategories && !categoryModal && !deleting && <Modal show title="Quản lý danh mục" onClose={()=>setManageCategories(false)} size="lg"><div className="mm-category-list">{categories.length?categories.map(c=><div key={c.id}><span><strong>{c.name}</strong><small>{categoryTypes[c.categoryType]} · {c.itemCount} món</small></span><div><button className="btn btn-light-soft btn-sm" onClick={()=>setCategoryModal(c)}>Sửa</button><button className="btn btn-outline-danger btn-sm" disabled={c.itemCount>0} title={c.itemCount?'Chuyển hoặc xoá các món trước':'Xoá danh mục'} onClick={()=>setDeleting({kind:'category',value:c})}>Xoá</button></div></div>):<p>Chưa có danh mục.</p>}</div><p className="cf-muted mt-3 mb-0">Để xoá danh mục còn món, sửa từng món và chuyển sang danh mục khác trước.</p></Modal>}
    {categoryModal && <MenuCategoryModal category={categoryModal.id?categoryModal:null} onClose={()=>setCategoryModal(null)} onSaved={()=>saved('category')} />}
    <ConfirmModal show={!!deleting} title={deleting?.kind==='item'?'Xoá món':'Xoá danh mục'} message={deleting?.kind==='item'?`Xoá “${deleting.value.name}” khỏi menu khách? Lịch sử đơn hàng vẫn được giữ nguyên.`:`Xoá danh mục “${deleting?.value.name || ''}”?`} confirmText="Xoá" danger loading={busy==='delete'} onClose={()=>setDeleting(null)} onConfirm={remove} />
  </div>
}
