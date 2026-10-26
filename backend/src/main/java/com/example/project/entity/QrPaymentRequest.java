package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ENTITY = 1 dòng trong bảng "qr_payment_requests" (V7): 1 lần thu ngân tạo mã QR payOS.
 * Chỉ khi payOS báo đã nhận đủ tiền mới tạo hóa đơn (payments), nên mã PM... không bị nhảy số vì mã QR hết hạn.
 *
 * status: PENDING (chờ khách quét) -> PAID | EXPIRED | CANCELLED.
 *         MISMATCH = tiền đã về nhưng không ghi được vào hóa đơn (đơn đã đổi / đã thu cách khác / chuyển thiếu)
 *         -> thu ngân kiểm tra app ngân hàng và xử lý tay.
 * targetType: TABLE = thu các đơn tại bàn (orders); TAKEAWAY = bán mang đi, CHƯA có đơn:
 *         giỏ hàng lưu ở cartJson, khách trả xong mới tạo đơn và gửi pha chế.
 */
@Entity
@Table(name = "qr_payment_requests")
public class QrPaymentRequest {

    public static final String PENDING = "PENDING";
    public static final String PAID = "PAID";
    public static final String EXPIRED = "EXPIRED";
    public static final String CANCELLED = "CANCELLED";
    public static final String MISMATCH = "MISMATCH";

    public static final String TABLE = "TABLE";
    public static final String TAKEAWAY = "TAKEAWAY";
    /** Khách đặt online tự tạo mã (ThangNN Iter2). Giống TAKEAWAY: chưa có đơn, giỏ hàng + thông tin giao hàng ở cartJson. */
    public static final String ONLINE = "ONLINE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "qr_request_id")
    private Long id;

    /** Mã đơn gửi sang payOS. */
    @Column(name = "order_code", nullable = false)
    private Long orderCode;

    @Column(name = "payment_link_id", length = 64)
    private String paymentLinkId;

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_session_id")
    private TableSession tableSession;

    /** Các đơn tại bàn được thu trong mã này (chỉ có với TABLE). */
    @ManyToMany
    @JoinTable(name = "qr_payment_request_orders",
            joinColumns = @JoinColumn(name = "qr_request_id"),
            inverseJoinColumns = @JoinColumn(name = "order_id"))
    @OrderBy("id ASC")
    private List<Order> orders = new ArrayList<>();

    /** Giỏ hàng mang đi (JSON QrTakeawayCart), chỉ có với TAKEAWAY. */
    @Column(name = "cart_json", columnDefinition = "TEXT")
    private String cartJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    /** Số điểm khách dùng để giảm giá. Trong lúc mã còn chờ, số điểm này bị "giữ", không dùng cho hóa đơn khác. */
    @Column(name = "points_to_redeem", nullable = false)
    private Integer pointsToRedeem = 0;

    /** Tạm tính trước giảm giá. */
    @Column(nullable = false)
    private Long subtotal;

    /** Số tiền trong mã QR (đã trừ giảm giá bằng điểm). */
    @Column(nullable = false)
    private Long amount;

    /** Nội dung chuyển khoản gửi payOS (tối đa 9 ký tự). */
    @Column(nullable = false, length = 25)
    private String description;

    /** Chuỗi VietQR payOS trả về, frontend vẽ thành mã QR. */
    @Column(name = "qr_code", length = 1000)
    private String qrCode;

    @Column(name = "checkout_url", length = 500)
    private String checkoutUrl;

    @Column(nullable = false, length = 20)
    private String status = PENDING;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Thu ngân tạo mã. Khi hệ thống tự xác nhận, hóa đơn ghi người này là thu ngân. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** Lúc đổi trạng thái gần nhất (màn thu ngân dựa vào đây để báo "vừa thanh toán xong"). */
    @Column(name = "status_changed_at")
    private LocalDateTime statusChangedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /** Hóa đơn được tạo khi khách trả xong. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    /** Mã giao dịch ngân hàng payOS gửi về. */
    @Column(name = "bank_reference", length = 100)
    private String bankReference;

    /** WEBHOOK | POLLING | CANCEL_CHECK: hệ thống biết khách đã trả bằng cách nào. */
    @Column(name = "confirmed_via", length = 20)
    private String confirmedVia;

    /** Lý do hủy / hết hạn / không ghi được tiền. */
    @Column(length = 500)
    private String note;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.statusChangedAt = this.createdAt;
    }

    public boolean isPending() { return PENDING.equals(status); }

    public boolean isTable() { return TABLE.equals(targetType); }

    public boolean isOnline() { return ONLINE.equals(targetType); }

    /** Đổi trạng thái + ghi lúc đổi (và lý do nếu có). */
    public void moveTo(String newStatus, String reason) {
        this.status = newStatus;
        this.statusChangedAt = LocalDateTime.now();
        if (reason != null) this.note = reason.length() > 500 ? reason.substring(0, 500) : reason;
    }

    public Long getId() { return id; }
    public long getOrderCode() { return orderCode; }
    public void setOrderCode(long orderCode) { this.orderCode = orderCode; }
    public String getPaymentLinkId() { return paymentLinkId; }
    public void setPaymentLinkId(String paymentLinkId) { this.paymentLinkId = paymentLinkId; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public TableSession getTableSession() { return tableSession; }
    public void setTableSession(TableSession tableSession) { this.tableSession = tableSession; }
    public List<Order> getOrders() { return orders; }
    public String getCartJson() { return cartJson; }
    public void setCartJson(String cartJson) { this.cartJson = cartJson; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public int getPointsToRedeem() { return pointsToRedeem == null ? 0 : pointsToRedeem; }
    public void setPointsToRedeem(int pointsToRedeem) { this.pointsToRedeem = pointsToRedeem; }
    public long getSubtotal() { return subtotal; }
    public void setSubtotal(long subtotal) { this.subtotal = subtotal; }
    public long getAmount() { return amount; }
    public void setAmount(long amount) { this.amount = amount; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getQrCode() { return qrCode; }
    public void setQrCode(String qrCode) { this.qrCode = qrCode; }
    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String checkoutUrl) { this.checkoutUrl = checkoutUrl; }
    public String getStatus() { return status; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getStatusChangedAt() { return statusChangedAt; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }
    public String getBankReference() { return bankReference; }
    public void setBankReference(String bankReference) {
        this.bankReference = bankReference == null || bankReference.length() <= 100 ? bankReference : bankReference.substring(0, 100);
    }
    public String getConfirmedVia() { return confirmedVia; }
    public void setConfirmedVia(String confirmedVia) { this.confirmedVia = confirmedVia; }
    public String getNote() { return note; }
}
