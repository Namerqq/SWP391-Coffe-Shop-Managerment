package com.example.project.dto;

import com.example.project.entity.CafeTable;

/** Thông tin bàn trả về cho khách sau khi quét QR. */
public record TableInfoResponse(Long id, String tableNumber, String qrCode) {
    public static TableInfoResponse from(CafeTable t) {
        return new TableInfoResponse(t.getId(), t.getTableNumber(), t.getQrCode());
    }
}
