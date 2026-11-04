package com.example.project.service;
import com.example.project.entity.*;
import com.example.project.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class TablePaymentClosureTest {
    OrderRepository orders=mock(OrderRepository.class);
    GuestSessionStore guests=mock(GuestSessionStore.class);
    OrderSupportService support=new OrderSupportService(null,orders,null,null,null,null,guests,null);
    TableSession session() {
        TableSession s=new TableSession(); ReflectionTestUtils.setField(s,"id",1L);
        CafeTable t=new CafeTable(); t.setStatus(CafeTable.OCCUPIED); s.setTable(t); return s;
    }
    @Test void paidButNotServedKeepsTableOccupied() {
        TableSession s=session(); Order o=new Order(); o.setStatus(Order.PENDING); o.setPaymentStatus(Payment.PAID);
        when(orders.findByTableSession_IdOrderByCreatedAtAsc(1L)).thenReturn(List.of(o));
        assertFalse(support.closeSessionIfSettled(s));
        assertEquals(TableSession.OPEN,s.getStatus()); assertEquals(CafeTable.OCCUPIED,s.getTable().getStatus());
        verifyNoInteractions(guests);
    }
    @Test void servedButNotPaidKeepsTableOccupied() {
        TableSession s=session(); Order o=new Order(); o.setStatus(Order.SERVED);
        when(orders.findByTableSession_IdOrderByCreatedAtAsc(1L)).thenReturn(List.of(o));
        assertFalse(support.closeSessionIfSettled(s));
        assertEquals(CafeTable.OCCUPIED,s.getTable().getStatus());
    }
    @Test void paidAndServedClosesTable() {
        TableSession s=session(); Order o=new Order(); o.setStatus(Order.SERVED); o.setPaymentStatus(Payment.PAID);
        when(orders.findByTableSession_IdOrderByCreatedAtAsc(1L)).thenReturn(List.of(o));
        assertTrue(support.closeSessionIfSettled(s));
        assertEquals(TableSession.CLOSED,s.getStatus()); assertEquals(CafeTable.AVAILABLE,s.getTable().getStatus());
        verify(guests).endTableSession(1L);
        assertFalse(support.closeSessionIfSettled(s));
    }
    @Test void partialPaymentKeepsSessionOpen() {
        TableSession s=session(); Order paid=new Order(); paid.setStatus(Order.SERVED); paid.setPaymentStatus(Payment.PAID);
        Order unpaid=new Order(); unpaid.setStatus(Order.SERVED);
        when(orders.findByTableSession_IdOrderByCreatedAtAsc(1L)).thenReturn(List.of(paid,unpaid));
        assertFalse(support.closeSessionIfSettled(s)); assertEquals(TableSession.OPEN,s.getStatus());
        verifyNoInteractions(guests);
    }
}
