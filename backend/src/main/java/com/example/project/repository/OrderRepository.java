package com.example.project.repository;

import com.example.project.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatusInOrderByCreatedAtAsc(Collection<String> statuses);
    List<Order> findByStatusAndFulfillmentTypeOrderByUpdatedAtAsc(String status, String fulfillmentType);
    List<Order> findByTableSession_IdOrderByCreatedAtAsc(Long tableSessionId);
    List<Order> findByTableSession_IdInOrderByCreatedAtAsc(Collection<Long> tableSessionIds);
    /** Các đơn đã được thu trong 1 hóa đơn (in lại hóa đơn). */
    List<Order> findByPayment_IdOrderByCreatedAtAsc(Long paymentId);
    boolean existsByTableSession_IdAndStatusNot(Long tableSessionId, String status);
    long countByOrderNumberStartingWith(String prefix);

    /** Danh sách đơn giao hàng (DELIVERY) mới nhất lên đầu cho màn hình Thu ngân. */
    List<Order> findByFulfillmentTypeOrderByCreatedAtDesc(String fulfillmentType);

    /**
     * Tìm đơn giao hàng: tạo trong [from, to) (null = bỏ điều kiện đó), mã đơn chứa code (null = mọi mã),
     * mới nhất lên đầu.
     */
    @Query("select o from Order o where o.fulfillmentType = :type "
            + "and (:from is null or o.createdAt >= :from) "
            + "and (:to is null or o.createdAt < :to) "
            + "and (:code is null or o.orderNumber like concat('%', :code, '%')) "
            + "order by o.createdAt desc, o.id desc")
    List<Order> searchByFulfillmentType(@Param("type") String fulfillmentType, @Param("from") LocalDateTime from,
                                        @Param("to") LocalDateTime to, @Param("code") String code);

    /** Tìm kiếm lịch sử đơn hàng online theo số điện thoại khách hàng. */
    List<Order> findByCustomerPhoneAndSourceOrderByCreatedAtDesc(String customerPhone, String source);

    /** Tra đơn online theo mã đơn khách nhập (order_number dạng yyMMdd-0001). */
    java.util.Optional<Order> findFirstByOrderNumberAndSourceOrderByIdDesc(String orderNumber, String source);
}
