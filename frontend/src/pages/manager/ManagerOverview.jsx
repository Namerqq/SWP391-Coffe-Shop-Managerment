import { useEffect, useState } from 'react'

export default function ManagerOverview() {
  return (
    <div>
      <h1 className="page-title">Tổng quan Quản lý</h1>
      <p className="page-subtitle mb-4">Chào mừng đến với trang quản lý dành cho Manager.</p>
      
      <div className="row g-4">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="cf-card stat-card">
            <div className="d-flex align-items-center gap-3">
              <div className="stat-icon"><i className="bi bi-box-seam" /></div>
              <div>
                <div className="cf-section-title mb-1">Kho nguyên liệu</div>
                <div className="stat-value">Quản lý kho</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
