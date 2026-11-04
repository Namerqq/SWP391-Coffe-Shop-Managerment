package com.example.project.service;
import com.example.project.entity.*;
import com.example.project.repository.*;
import com.example.project.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ManagerTableServiceTest {
    CafeTableRepository tables = mock(CafeTableRepository.class);
    TableSessionRepository sessions = mock(TableSessionRepository.class);
    SystemSettingRepository settings = mock(SystemSettingRepository.class);
    GuestSessionStore guests = mock(GuestSessionStore.class);
    ManagerTableService service = new ManagerTableService(tables, sessions, settings, guests);
    CafeTable table() {
        CafeTable t = new CafeTable(); ReflectionTestUtils.setField(t,"id",1L);
        t.setTableNumber("Bàn 01"); t.setQrCode("stable-qr"); return t;
    }
    @Test void createsPersistentRandomQr() {
        when(tables.findAll()).thenReturn(List.of());
        when(tables.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        var a = service.save(null,"Bàn 01",true);
        var b = service.save(null,"Bàn 02",true);
        assertNotEquals(a.qrCode(), b.qrCode()); assertDoesNotThrow(() -> UUID.fromString(a.qrCode()));
    }
    @Test void renameRetainsQr() {
        CafeTable t=table(); when(tables.findAll()).thenReturn(List.of(t));
        when(tables.findById(1L)).thenReturn(Optional.of(t));
        when(tables.saveAndFlush(t)).thenReturn(t);
        assertEquals("stable-qr",service.save(1L,"Bàn mới",true).qrCode());
    }
    @Test void rejectsDuplicateIncludingInactive() {
        CafeTable t=table(); t.setActive(false); when(tables.findAll()).thenReturn(List.of(t));
        assertThrows(ApiException.class, () -> service.save(null," bàn 01 ",true));
    }
    @Test void cannotDisableOpenSession() {
        CafeTable t=table(); when(tables.findAll()).thenReturn(List.of(t));
        when(tables.findById(1L)).thenReturn(Optional.of(t));
        when(sessions.findFirstByTable_IdAndStatusIn(eq(1L),any())).thenReturn(Optional.of(new TableSession()));
        assertThrows(ApiException.class, () -> service.save(1L,"Bàn 01",false));
        verify(tables,never()).saveAndFlush(any());
    }
}
