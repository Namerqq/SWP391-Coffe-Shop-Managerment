package com.example.project.service;

import com.example.project.dto.guest.GuestTableView;
import com.example.project.entity.CafeTable;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CafeTableRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** UC-CU01 View Menu: khách quét QR trên bàn để mở phiên gọi món (không cần đăng nhập). */
@Service
public class GuestTableService {

    private final CafeTableRepository tableRepository;
    private final GuestSessionStore guests;

    public GuestTableService(CafeTableRepository tableRepository, GuestSessionStore guests) {
        this.tableRepository = tableRepository;
        this.guests = guests;
    }

    /** Quét QR: xác nhận bàn, giữ phiên cũ nếu vẫn là bàn đó (để còn xem đơn đã gọi). */
    @Transactional(readOnly = true)
    public GuestTableView openTable(String qrCode, String token) {
        String qr = qrCode == null ? "" : qrCode.trim();
        CafeTable table = tableRepository.findAll().stream()
                .filter(t -> qr.equalsIgnoreCase(t.getQrCode()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Mã QR bàn không hợp lệ. Vui lòng quét lại mã trên bàn."));
        if (!Boolean.TRUE.equals(table.getActive()) || CafeTable.UNAVAILABLE.equals(table.getStatus())) {
            throw ApiException.badRequest(table.getTableNumber() + " đang tạm ngưng phục vụ. Vui lòng báo nhân viên.");
        }
        GuestSessionStore.Guest current = guests.find(token);
        String useToken = current != null && current.tableId() == table.getId() ? token : guests.create(table.getId());
        return new GuestTableView(useToken, table.getId(), table.getTableNumber());
    }

    /** Phiên hiện tại (null nếu chưa quét QR hoặc đã hết hạn). */
    @Transactional(readOnly = true)
    public GuestTableView context(String token) {
        GuestSessionStore.Guest g = guests.find(token);
        if (g == null) return null;
        return tableRepository.findById(g.tableId())
                .map(t -> new GuestTableView(token, t.getId(), t.getTableNumber()))
                .orElse(null);
    }
}
