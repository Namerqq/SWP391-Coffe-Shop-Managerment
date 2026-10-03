package com.example.project.ordering;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static com.example.project.ordering.OrderDtos.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named="TEST_DB_URL",matches=".*cafe_management_khoibm_test.*")
class FrozenOrderingTransactionTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",()->System.getenv("TEST_DB_URL"));
        r.add("spring.datasource.username",()->System.getenv().getOrDefault("TEST_DB_USER","root"));
        r.add("spring.datasource.password",()->System.getenv("TEST_DB_PASSWORD"));
    }
    @Autowired OrderingService service;
    @Autowired OrderingRepository repo;
    @Autowired JdbcTemplate jdbc;
    long tableId,drinkId,categoryId;
    @BeforeEach void setup() {
        String unique=UUID.randomUUID().toString().substring(0,8);
        categoryId=repo.insert("INSERT INTO categories(category_name) VALUES(?)","Tx-"+unique);
        drinkId=repo.insert("INSERT INTO menu_items(category_id,item_name,base_price) VALUES(?,? ,35000)",categoryId,"Tx Coffee-"+unique);
        tableId=repo.insert("INSERT INTO cafe_tables(table_number,qr_code) VALUES(?,?)","Tx-"+unique,"TX-"+unique);
    }
    @AfterEach void cleanup() {
        jdbc.update("DELETE FROM orders WHERE table_session_id IN (SELECT table_session_id FROM table_sessions WHERE table_id=?)",tableId);
        jdbc.update("DELETE FROM table_sessions WHERE table_id=?",tableId);
        jdbc.update("DELETE FROM cafe_tables WHERE table_id=?",tableId);
        jdbc.update("DELETE FROM menu_items WHERE menu_item_id=?",drinkId);
        jdbc.update("DELETE FROM categories WHERE category_id=?",categoryId);
    }
    OrderInput input(String key) {
        return new OrderInput(tableId,"transaction test",List.of(new ItemInput(drinkId,"M","100%","Bình thường",List.of(),1,"")),key,null);
    }
    @Test void failedOrderRollsBackItsNewTableSession() {
        jdbc.update("UPDATE menu_items SET availability_status='UNAVAILABLE' WHERE menu_item_id=?",drinkId);
        assertThrows(OrderProblem.class,()->service.create(input("request-one-1234567890"),null,tableId,"nonce"));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM table_sessions WHERE table_id=?",Integer.class,tableId));
        assertEquals("AVAILABLE",jdbc.queryForObject("SELECT status FROM cafe_tables WHERE table_id=?",String.class,tableId));
    }
    @Test void simultaneousRequestsReuseSessionAndDoNotDuplicateOrders() throws Exception {
        var pool=Executors.newFixedThreadPool(3);var gate=new CountDownLatch(1);
        try {
            Future<Order> a=pool.submit(()->{gate.await();return service.create(input("same-request-1234567890"),null,tableId,"nonce");});
            Future<Order> b=pool.submit(()->{gate.await();return service.create(input("same-request-1234567890"),null,tableId,"nonce");});
            Future<Order> c=pool.submit(()->{gate.await();return service.create(input("other-request-123456789"),null,tableId,"nonce");});
            gate.countDown();var oa=a.get(15,TimeUnit.SECONDS);var ob=b.get(15,TimeUnit.SECONDS);var oc=c.get(15,TimeUnit.SECONDS);
            assertEquals(oa.id(),ob.id());assertNotEquals(oa.id(),oc.id());assertEquals(oa.sessionId(),oc.sessionId());
            assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM table_sessions WHERE table_id=?",Integer.class,tableId));
            assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE table_session_id=?",Integer.class,oa.sessionId()));
        } finally {pool.shutdownNow();}
    }
}
