package com.example.project.repository;

import com.example.project.entity.Customer;
import com.example.project.entity.LoyaltyTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Màn Khách thân thiết của Thu ngân (ThangNN Iter3, UC-C12 / C10 / C13): danh sách khách + lịch sử điểm.
 * Tách riêng để không sửa CustomerRepository / LoyaltyTransactionRepository dùng chung.
 */
public interface LoyaltyCustomerRepository extends Repository<Customer, Long> {

    /**
     * Tìm theo 1 phần số điện thoại hoặc tên (kw = null -> mọi khách). Sắp xếp theo Pageable.
     * DB dùng collation utf8mb4_0900_ai_ci nên tìm tên không phân biệt hoa thường / dấu ("thang" ra "Thắng").
     */
    @Query("select c from Customer c where :kw is null "
            + "or c.phoneNumber like concat('%', :kw, '%') "
            + "or lower(c.fullName) like lower(concat('%', :kw, '%'))")
    Page<Customer> search(@Param("kw") String kw, Pageable pageable);

    Optional<Customer> findById(Long id);

    Customer save(Customer customer);

    /** Lần cộng / dùng điểm gần nhất của từng khách: mỗi dòng [customerId, createdAt]. */
    @Query("select t.customer.id, max(t.createdAt) from LoyaltyTransaction t "
            + "where t.customer.id in :ids group by t.customer.id")
    List<Object[]> lastActivity(@Param("ids") Collection<Long> ids);

    /** Toàn bộ giao dịch điểm của 1 khách, mới nhất trước (kèm phiếu thanh toán để mở lại hóa đơn). */
    @Query("select t from LoyaltyTransaction t left join fetch t.payment "
            + "where t.customer.id = :customerId order by t.createdAt desc, t.id desc")
    List<LoyaltyTransaction> history(@Param("customerId") Long customerId);
}
