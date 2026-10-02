package com.example.project.service;

import com.example.project.dto.*;
import com.example.project.entity.*;
import com.example.project.entity.enums.*;
import com.example.project.exception.BusinessException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Màn Customer Menu (khách quét QR):
 * UC-CU01 View Menu, UC-CU02 Place Self-Order, UC-CU03 Select Order Item.
 */
@Service
public class SelfOrderService {

    private static final DateTimeFormatter CODE_TIME = DateTimeFormatter.ofPattern("yyMMddHHmmss");
    private static final List<SessionStatus> ACTIVE_SESSION = List.of(SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING);

    private final CafeTableRepository tableRepository;
    private final TableSessionRepository sessionRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderRepository orderRepository;

    public SelfOrderService(CafeTableRepository tableRepository, TableSessionRepository sessionRepository,
                            MenuItemRepository menuItemRepository, OrderRepository orderRepository) {
        this.tableRepository = tableRepository;
        this.sessionRepository = sessionRepository;
        this.menuItemRepository = menuItemRepository;
        this.orderRepository = orderRepository;
    }

    /** Khách quét QR -> lấy thông tin bàn. Bàn tạm ngưng thì báo lỗi. */
    @Transactional(readOnly = true)
    public TableInfoResponse getTable(String qrCode) {
        return TableInfoResponse.from(findServingTable(qrCode));
    }

    /** Menu của khách: chỉ danh mục ACTIVE, bỏ món INACTIVE, nhóm theo danh mục. */
    @Transactional(readOnly = true)
    public List<MenuCategoryResponse> getMenu() {
        Map<Category, List<MenuItemResponse>> grouped = new LinkedHashMap<>();
        for (MenuItem m : menuItemRepository.findForCustomerMenu(CategoryStatus.ACTIVE, MenuItemStatus.INACTIVE)) {
            grouped.computeIfAbsent(m.getCategory(), k -> new ArrayList<>()).add(MenuItemResponse.from(m));
        }
        return grouped.entrySet().stream()
                .map(e -> new MenuCategoryResponse(e.getKey().getId(), e.getKey().getName(),
                        e.getKey().getDescription(), e.getValue()))
                .toList();
    }

    /**
     * Khách gửi đơn: kiểm tra bàn + từng món, server tự tính giá,
     * tạo đơn QR_TABLE / DINE_IN ở trạng thái PENDING_CONFIRMATION (mặc định của DB).
     */
    @Transactional
    public OrderResponse placeOrder(PlaceOrderRequest req) {
        CafeTable table = findServingTable(req.qrCode());

        Order order = new Order();
        order.setOrderSource(OrderSource.QR_TABLE);
        order.setFulfillmentType(FulfillmentType.DINE_IN);
        order.setCustomerNote(blankToNull(req.customerNote()));

        for (OrderItemRequest line : req.items()) {
            MenuItem menuItem = menuItemRepository.findById(line.menuItemId())
                    .orElseThrow(() -> new BusinessException("Món id = " + line.menuItemId() + " không tồn tại"));
            if (!menuItem.isOrderable()) {
                throw new BusinessException("Món \"" + menuItem.getName() + "\" hiện đã hết, vui lòng chọn món khác");
            }

            OrderItem item = new OrderItem();
            item.setMenuItem(menuItem);
            item.setQuantity(line.quantity());
            item.setUnitPrice(menuItem.getBasePrice()); // snapshot giá tại thời điểm đặt
            item.setSugarLevel(blankToNull(line.sugarLevel()));
            item.setIceLevel(blankToNull(line.iceLevel()));
            item.setNote(blankToNull(line.note()));
            item.calculateSubtotal();
            order.addItem(item);
        }

        order.setTableSession(getOrOpenSession(table));
        order.setOrderNumber(generateCode("OD"));
        return OrderResponse.from(orderRepository.save(order));
    }

    /** Bàn phải tồn tại, đang hoạt động và không ở trạng thái UNAVAILABLE. */
    private CafeTable findServingTable(String qrCode) {
        CafeTable table = tableRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new ResourceNotFoundException("Mã QR không hợp lệ, vui lòng quét lại mã trên bàn"));
        if (!table.isActive() || table.getStatus() == TableStatus.UNAVAILABLE) {
            throw new BusinessException(table.getTableNumber() + " đang tạm ngưng phục vụ, vui lòng gọi nhân viên");
        }
        return table;
    }

    /**
     * Mỗi bàn chỉ có 1 session OPEN/PAYMENT_PENDING (DB đảm bảo bằng uq_table_sessions_active_table).
     * - Có session OPEN: gắn đơn vào đó.
     * - Đang PAYMENT_PENDING: không nhận thêm đơn tự gọi.
     * - Chưa có: mở session mới và chuyển bàn sang OCCUPIED.
     */
    private TableSession getOrOpenSession(CafeTable table) {
        Optional<TableSession> active = sessionRepository.findFirstByTableIdAndStatusIn(table.getId(), ACTIVE_SESSION);
        if (active.isPresent()) {
            if (active.get().getStatus() == SessionStatus.PAYMENT_PENDING) {
                throw new BusinessException("Bàn đang chờ thanh toán, vui lòng gọi nhân viên để gọi thêm món");
            }
            return active.get();
        }
        TableSession s = new TableSession();
        s.setTable(table);
        s.setSessionCode(generateCode("SS"));
        table.setStatus(TableStatus.OCCUPIED);
        tableRepository.save(table);
        return sessionRepository.save(s);
    }

    /** Mã dạng OD2610011530224821: tiền tố + thời gian + 4 số ngẫu nhiên (tối đa 40 ký tự theo DB). */
    private String generateCode(String prefix) {
        return prefix + LocalDateTime.now().format(CODE_TIME) + String.format("%04d", new Random().nextInt(10000));
    }

    private String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
