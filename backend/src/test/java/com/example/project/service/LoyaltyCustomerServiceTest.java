package com.example.project.service;

import com.example.project.dto.cashier.CustomerUpdateRequest;
import com.example.project.dto.cashier.LoyaltyCustomerPage;
import com.example.project.dto.cashier.LoyaltyCustomerRow;
import com.example.project.dto.cashier.LoyaltyHistoryView;
import com.example.project.entity.Customer;
import com.example.project.entity.LoyaltyTransaction;
import com.example.project.entity.Payment;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.LoyaltyCustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

/**
 * Loyalty Customer List & Point History (ThangNN Iter3, UC-C12 / C10 / C13).
 * Chạy riêng: mvn test -Dtest=LoyaltyCustomerServiceTest
 */
class LoyaltyCustomerServiceTest {

    private LoyaltyCustomerRepository repository;
    private LoyaltyCustomerService service;

    @BeforeEach
    void setUp() {
        repository = mock(LoyaltyCustomerRepository.class);
        service = new LoyaltyCustomerService(repository);
        when(repository.search(any(), any())).thenReturn(Page.empty());
        when(repository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Customer customer(long id, String phone, String name, int points) {
        Customer c = new Customer();
        ReflectionTestUtils.setField(c, "id", id);
        c.setPhoneNumber(phone);
        c.setFullName(name);
        c.setCurrentPoints(points);
        return c;
    }

    private static LoyaltyTransaction tx(long id, Customer c, Payment p, int change, String type, LocalDateTime at) {
        LoyaltyTransaction t = LoyaltyTransaction.of(c, p, null, change, type, "note " + id);
        ReflectionTestUtils.setField(t, "id", id);
        ReflectionTestUtils.setField(t, "createdAt", at);
        return t;
    }

    // ===== Danh sách =====

    @Test
    void listDefaultsToFirstPageOf20NewestFirst() {
        service.list(null, null, null, null);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).search(isNull(), pageable.capture());
        assertEquals(0, pageable.getValue().getPageNumber());
        assertEquals(20, pageable.getValue().getPageSize());
        assertEquals(Sort.Direction.DESC, pageable.getValue().getSort().getOrderFor("createdAt").getDirection());
    }

    @Test
    void listClampsPageAndSize() {
        service.list(null, null, -3, 1000);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).search(isNull(), pageable.capture());
        assertEquals(0, pageable.getValue().getPageNumber());
        assertEquals(LoyaltyCustomerService.MAX_PAGE_SIZE, pageable.getValue().getPageSize());
    }

    @Test
    void phoneKeywordDropsSeparatorsNameKeywordIsTrimmed() {
        service.list(" 0901 234.56-7 ", null, 0, 20);
        verify(repository).search(eq("09012345678"), any());

        service.list("  Thắng ", null, 0, 20);
        verify(repository).search(eq("Thắng"), any());

        service.list("   ", null, 0, 20);
        verify(repository).search(isNull(), any());
    }

    @Test
    void sortOptions() {
        assertEquals(Sort.Direction.DESC, LoyaltyCustomerService.sortOf("points").getOrderFor("currentPoints").getDirection());
        assertEquals(Sort.Direction.ASC, LoyaltyCustomerService.sortOf("name").getOrderFor("fullName").getDirection());
        assertNotNull(LoyaltyCustomerService.sortOf("anything-else").getOrderFor("createdAt"));
    }

    @Test
    void listRowsCarryLastActivity() {
        Customer a = customer(1, "0901111111", "An", 12);
        Customer b = customer(2, "0902222222", null, 0);
        LocalDateTime at = LocalDateTime.of(2026, 10, 20, 9, 30);
        when(repository.search(any(), any())).thenReturn(new PageImpl<>(List.of(a, b), PageRequest.of(0, 20), 2));
        List<Object[]> last = new ArrayList<>();
        last.add(new Object[]{1L, at});
        when(repository.lastActivity(List.of(1L, 2L))).thenReturn(last);

        LoyaltyCustomerPage page = service.list(null, null, 0, 20);

        assertEquals(2, page.totalItems());
        assertEquals(1, page.totalPages());
        assertEquals(at, page.items().get(0).lastActivityAt());
        assertNull(page.items().get(1).lastActivityAt());
        assertEquals(12, page.items().get(0).currentPoints());
    }

    @Test
    void emptyPageDoesNotQueryLastActivity() {
        service.list("khong-co", null, 0, 20);
        verify(repository, never()).lastActivity(any());
    }

    // ===== Lịch sử điểm =====

    @Test
    void historyComputesBalanceAfterEachTransactionAndTotals() {
        Customer c = customer(3, "0903333333", "Bình", 25);
        Payment pay = new Payment();
        ReflectionTestUtils.setField(pay, "id", 9L);
        ReflectionTestUtils.setField(pay, "paymentCode", "PM261025-0009");
        LocalDateTime d = LocalDateTime.of(2026, 10, 25, 10, 0);
        // Mới nhất trước: hóa đơn 9 dùng 10 điểm rồi tích 5; trước đó tích 30.
        List<LoyaltyTransaction> txs = List.of(
                tx(3, c, pay, 5, LoyaltyTransaction.EARN, d),
                tx(2, c, pay, -10, LoyaltyTransaction.REDEEM, d),
                tx(1, c, null, 30, LoyaltyTransaction.EARN, d.minusDays(2)));
        when(repository.findById(3L)).thenReturn(Optional.of(c));
        when(repository.history(3L)).thenReturn(txs);

        LoyaltyHistoryView v = service.history(3L);

        assertEquals(35, v.totalEarned());
        assertEquals(10, v.totalRedeemed());
        assertEquals(List.of(25, 20, 30), v.transactions().stream().map(LoyaltyHistoryView.Entry::balanceAfter).toList());
        assertEquals(9L, v.transactions().get(0).paymentId());
        assertEquals("PM261025-0009", v.transactions().get(0).paymentCode());
        assertNull(v.transactions().get(2).paymentId());
        assertEquals(d, v.customer().lastActivityAt());
    }

    @Test
    void historyOfCustomerWithoutTransactions() {
        when(repository.findById(4L)).thenReturn(Optional.of(customer(4, "0904444444", null, 0)));
        when(repository.history(4L)).thenReturn(List.of());

        LoyaltyHistoryView v = service.history(4L);

        assertTrue(v.transactions().isEmpty());
        assertEquals(0, v.totalEarned());
        assertNull(v.customer().lastActivityAt());
    }

    @Test
    void historyOfUnknownCustomerIs404() {
        when(repository.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.history(99L));
    }

    // ===== Sửa tên (SĐT không sửa được) =====

    @Test
    void updateChangesNameOnlyKeepsPhoneAndPoints() {
        Customer c = customer(5, "0905555555", "Cũ", 40);
        when(repository.findById(5L)).thenReturn(Optional.of(c));

        LoyaltyCustomerRow row = service.update(5L, new CustomerUpdateRequest("  Mới  "));

        assertEquals("Mới", row.fullName());
        assertEquals("0905555555", row.phoneNumber());
        assertEquals(40, row.currentPoints());
        verify(repository).save(c);
    }

    @Test
    void blankNameBecomesNull() {
        Customer c = customer(5, "0905555555", "A", 0);
        when(repository.findById(5L)).thenReturn(Optional.of(c));

        LoyaltyCustomerRow row = service.update(5L, new CustomerUpdateRequest("   "));

        assertNull(row.fullName());
        assertEquals("0905555555", row.phoneNumber());
    }

    @Test
    void updateUnknownCustomerIs404() {
        when(repository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.update(99L, new CustomerUpdateRequest("A")));
        verify(repository, never()).save(any());
    }
}
