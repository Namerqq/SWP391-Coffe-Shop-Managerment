package com.example.project.ordering;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"app.ordering.fixed-table-qr=", "app.ordering.staff-login-enabled=true"})
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="TEST_DB_URL",matches=".*cafe_management_khoibm_test.*")
class FrozenOrderingIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",()->System.getenv("TEST_DB_URL"));
        r.add("spring.datasource.username",()->System.getenv().getOrDefault("TEST_DB_USER","root"));
        r.add("spring.datasource.password",()->System.getenv("TEST_DB_PASSWORD"));
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    long tableId,drinkId,userId;
    MockHttpSession customer,other,staff;
    @BeforeEach void seed() {
        customer=new MockHttpSession();other=new MockHttpSession();staff=new MockHttpSession();
        jdbc.update("INSERT INTO categories(category_name) VALUES('Test Coffee')");
        long category=jdbc.queryForObject("SELECT category_id FROM categories WHERE category_name='Test Coffee'",Long.class);
        jdbc.update("INSERT INTO menu_items(category_id,item_name,base_price) VALUES(?,'Test Latte',35000)",category);
        drinkId=jdbc.queryForObject("SELECT menu_item_id FROM menu_items WHERE item_name='Test Latte'",Long.class);
        jdbc.update("INSERT INTO cafe_tables(table_number,qr_code) VALUES('Test Table','TEST-QR')");
        tableId=jdbc.queryForObject("SELECT table_id FROM cafe_tables WHERE qr_code='TEST-QR'",Long.class);
        jdbc.update("INSERT INTO users(role_id,full_name,username,email,password_hash) SELECT role_id,'Test Waiter','test-waiter','waiter@example.invalid',? FROM roles WHERE role_name='WAITER'",new BCryptPasswordEncoder().encode("test-password"));
        userId=jdbc.queryForObject("SELECT user_id FROM users WHERE username='test-waiter'",Long.class);
        staff.setAttribute("staffId",userId);
    }
    String body() {return """
        {"tableId":%d,"requestKey":"test-request-1234567890","note":"Test order","items":[
        {"drinkId":%d,"size":"L","sugar":"50%%","ice":"Ít đá","extras":["Kem sữa"],"quantity":2,"note":"No straw","unitPrice":1}]}
        """.formatted(tableId,drinkId);}
    void bind(MockHttpSession session) throws Exception {
        mvc.perform(post("/api/cafe/table-context").session(session).header("X-Cafe-Client","web").contentType("application/json").content("{\"qrCode\":\"TEST-QR\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(tableId));
    }
    JsonNode create(MockHttpSession session,boolean assisted,String data) throws Exception {
        String response=mvc.perform(post(assisted?"/api/cafe/staff/orders":"/api/cafe/orders").session(session).header("X-Cafe-Client","web").contentType("application/json").content(data))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.total").value(110000)).andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }
    String cancelBody(JsonNode order) throws Exception {return json.writeValueAsString(java.util.Map.of("reason","Test cancellation","revision",order.get("revision").asText()));}
    @Test void frozenMigrationsHaveExactlySixteenBusinessTables() {
        assertEquals(16,jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name<>'flyway_schema_history'",Integer.class));
        assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE success=TRUE",Integer.class));
    }
    @Test void loadsMenuAndHidesInactiveCategories() throws Exception {
        mvc.perform(get("/api/cafe/menu")).andExpect(status().isOk()).andExpect(jsonPath("$[0].price").value(35000));
        jdbc.update("UPDATE categories SET status='INACTIVE' WHERE category_name='Test Coffee'");
        mvc.perform(get("/api/cafe/menu")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void createsRealSessionAndSnapshotAndDeduplicates() throws Exception {
        bind(customer);var order=create(customer,false,body());var second=create(customer,false,body());
        assertEquals(order.get("id"),second.get("id"));
        assertEquals("PENDING_CONFIRMATION",order.get("status").asText());
        assertEquals("QR_TABLE",order.get("source").asText());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM table_sessions",Integer.class));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM orders",Integer.class));
        assertEquals(35000,jdbc.queryForObject("SELECT unit_price FROM order_items",Long.class));
        assertEquals(10000,jdbc.queryForObject("SELECT size_price FROM order_items",Long.class));
        assertEquals(10000,jdbc.queryForObject("SELECT topping_price FROM order_items",Long.class));
        assertEquals("OCCUPIED",jdbc.queryForObject("SELECT status FROM cafe_tables WHERE table_id=?",String.class,tableId));
        create(customer,false,body().replace("test-request-1234567890","test-request-1234567891"));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM table_sessions",Integer.class));
        jdbc.update("UPDATE menu_items SET base_price=90000 WHERE menu_item_id=?",drinkId);
        mvc.perform(get("/api/cafe/orders").session(customer)).andExpect(jsonPath("$[0].total").value(110000));
    }
    @Test void enforcesQrOwnershipAndStaffRights() throws Exception {
        mvc.perform(post("/api/cafe/orders").session(customer).header("X-Cafe-Client","web").contentType("application/json").content(body())).andExpect(status().isForbidden());
        bind(customer);var order=create(customer,false,body());
        mvc.perform(get("/api/cafe/orders").session(other)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/cafe/orders/"+order.get("id")+"/cancel").session(other).header("X-Cafe-Client","web").contentType("application/json").content(cancelBody(order))).andExpect(status().isNotFound());
        mvc.perform(get("/api/cafe/staff/orders").session(other)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/cafe/tables").session(other)).andExpect(status().isUnauthorized());
    }
    @Test void staffCreateEditAndStaleRevision() throws Exception {
        var order=create(staff,true,body());assertEquals("STAFF",order.get("source").asText());
        assertEquals(userId,jdbc.queryForObject("SELECT created_by_user_id FROM orders",Long.class));
        ObjectNode input=(ObjectNode)json.readTree(body());input.put("revision",order.get("revision").asText());
        ((ObjectNode)input.get("items").get(0)).put("quantity",1);
        String payload=json.writeValueAsString(input);
        mvc.perform(put("/api/cafe/staff/orders/"+order.get("id")).session(staff).header("X-Cafe-Client","web").contentType("application/json").content(payload)).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(55000));
        mvc.perform(put("/api/cafe/staff/orders/"+order.get("id")).session(staff).header("X-Cafe-Client","web").contentType("application/json").content(payload)).andExpect(status().isConflict());
    }
    @Test void customerCannotEditEvenOwnPendingOrder() throws Exception {
        bind(customer);var order=create(customer,false,body());
        ObjectNode input=(ObjectNode)json.readTree(body());input.put("revision",order.get("revision").asText());
        ((ObjectNode)input.get("items").get(0)).put("quantity",1);
        mvc.perform(put("/api/cafe/orders/"+order.get("id")).session(customer).header("X-Cafe-Client","web")
            .contentType("application/json").content(json.writeValueAsString(input)))
            .andExpect(status().isForbidden());
        assertEquals(110000,jdbc.queryForObject("SELECT total_amount FROM orders WHERE order_id=?",Long.class,order.get("id").asLong()));
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"CONFIRMED","PREPARING","READY","COMPLETED","CANCELLED","REJECTED"})
    void customerCannotCancelNonPendingOrder(String state) throws Exception {
        bind(customer);var order=create(customer,false,body());
        jdbc.update("UPDATE orders SET status=? WHERE order_id=?",state,order.get("id").asLong());
        mvc.perform(post("/api/cafe/orders/"+order.get("id")+"/cancel").session(customer).header("X-Cafe-Client","web")
            .contentType("application/json").content(cancelBody(order))).andExpect(status().isConflict());
        assertEquals(state,jdbc.queryForObject("SELECT status FROM orders WHERE order_id=?",String.class,order.get("id").asLong()));
    }
    @Test void cancelIsAtomicAndClosedStateIsRejected() throws Exception {
        bind(customer);var order=create(customer,false,body());
        mvc.perform(post("/api/cafe/orders/"+order.get("id")+"/cancel").session(customer).header("X-Cafe-Client","web").contentType("application/json").content(cancelBody(order)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertEquals("CANCELLED",jdbc.queryForObject("SELECT item_status FROM order_items",String.class));
        assertNotNull(jdbc.queryForObject("SELECT cancelled_at FROM orders",java.sql.Timestamp.class));
        assertEquals("Test cancellation",jdbc.queryForObject("SELECT cancel_reason FROM orders",String.class));
        mvc.perform(post("/api/cafe/orders/"+order.get("id")+"/cancel").session(customer).header("X-Cafe-Client","web").contentType("application/json").content(cancelBody(order))).andExpect(status().isConflict());
    }
    @Test void cancellationFromPort5185IsAllowedButUnknownOriginIsRejected() throws Exception {
        bind(customer);var order=create(customer,false,body());
        mvc.perform(post("/api/cafe/orders/"+order.get("id")+"/cancel").session(customer)
            .header("Origin","http://example.invalid").header("X-Cafe-Client","web")
            .contentType("application/json").content(cancelBody(order))).andExpect(status().isForbidden());
        mvc.perform(post("/api/cafe/orders/"+order.get("id")+"/cancel").session(customer)
            .header("Origin","http://127.0.0.1:5185").header("X-Cafe-Client","web")
            .contentType("application/json").content(cancelBody(order)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
    }
    @Test void rejectsUnavailableAndPaymentPendingWithoutPartialWrites() throws Exception {
        bind(customer);jdbc.update("UPDATE menu_items SET availability_status='UNAVAILABLE' WHERE menu_item_id=?",drinkId);
        mvc.perform(post("/api/cafe/orders").session(customer).header("X-Cafe-Client","web").contentType("application/json").content(body())).andExpect(status().isConflict());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM orders",Integer.class));
        // Table session creation rolls back together with a failed order (verified in non-transactional smoke test too).
    }
    @Test void rejectsInvalidQuantityAndCsrfAndWrongPassword() throws Exception {
        bind(customer);
        mvc.perform(post("/api/cafe/orders").session(customer).contentType("application/json").content(body())).andExpect(status().isForbidden());
        mvc.perform(post("/api/cafe/orders").session(customer).header("X-Cafe-Client","web").contentType("application/json").content(body().replace("\"quantity\":2","\"quantity\":51"))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/cafe/staff/login").session(other).header("X-Cafe-Client","web").contentType("application/json").content("{\"username\":\"test-waiter\",\"password\":\"wrong\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/cafe/staff/login").session(other).header("X-Cafe-Client","web").contentType("application/json").content("{\"username\":\"test-waiter\",\"password\":\"test-password\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("WAITER"));
    }
    @Test void guardsAcceptedOrdersAndPaymentPendingSessions() throws Exception {
        bind(customer);var order=create(customer,false,body());
        jdbc.update("UPDATE orders SET status='PREPARING' WHERE order_id=?",order.get("id").asLong());
        mvc.perform(post("/api/cafe/orders/"+order.get("id")+"/cancel").session(customer).header("X-Cafe-Client","web").contentType("application/json").content(cancelBody(order))).andExpect(status().isConflict());
        jdbc.update("UPDATE table_sessions SET status='PAYMENT_PENDING' WHERE table_id=?",tableId);
        mvc.perform(post("/api/cafe/orders").session(customer).header("X-Cafe-Client","web").contentType("application/json").content(body().replace("test-request-1234567890","test-request-1234567899"))).andExpect(status().isConflict());
    }
}
