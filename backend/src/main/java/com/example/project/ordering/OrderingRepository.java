package com.example.project.ordering;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.sql.Statement;
import java.util.*;
import static com.example.project.ordering.OrderDtos.*;

@Repository
public class OrderingRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public OrderingRepository(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }
    public JdbcTemplate db() { return jdbc; }
    public List<Drink> menu() {
        return jdbc.query("SELECT m.*,c.category_name FROM menu_items m JOIN categories c ON c.category_id=m.category_id WHERE c.status='ACTIVE' AND m.availability_status<>'INACTIVE' ORDER BY c.category_id,m.item_name",
            (rs,n) -> new Drink(rs.getLong("menu_item_id"),rs.getLong("category_id"),rs.getString("category_name"),rs.getString("item_name"),rs.getString("description"),rs.getLong("base_price"),rs.getString("image_url"),"AVAILABLE".equals(rs.getString("availability_status"))));
    }
    public List<CafeTable> tables() {
        return jdbc.query("""
            SELECT t.*,s.table_session_id,s.status session_status,
            (SELECT COUNT(*) FROM orders o WHERE o.table_session_id=s.table_session_id AND o.status='PENDING_CONFIRMATION') pending_count,
            (SELECT COUNT(*) FROM orders o WHERE o.table_session_id=s.table_session_id AND o.status NOT IN ('COMPLETED','CANCELLED','REJECTED')) active_count
            FROM cafe_tables t LEFT JOIN table_sessions s ON s.active_table_id=t.table_id
            WHERE t.is_active=TRUE ORDER BY t.table_number
            """, (rs,n) -> new CafeTable(rs.getLong("table_id"),rs.getString("table_number"),rs.getString("qr_code"),rs.getString("status"),rs.getBoolean("is_active"),rs.getObject("table_session_id",Long.class),rs.getString("session_status"),rs.getInt("pending_count"),rs.getInt("active_count")));
    }
    public CafeTable table(long id) { return tables().stream().filter(t -> t.id()==id).findFirst().orElseThrow(() -> new OrderProblem(404,"Bàn không tồn tại hoặc đã ngừng hoạt động.")); }
    public long insert(String sql, Object... values) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> { var ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS); for (int i=0;i<values.length;i++) ps.setObject(i+1,values[i]); return ps; },key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
    public Map<String,Object> lockOrder(long id) {
        var rows = jdbc.queryForList("SELECT * FROM orders WHERE order_id=? FOR UPDATE",id);
        if (rows.isEmpty()) throw new OrderProblem(404,"Không tìm thấy đơn hàng.");
        return rows.get(0);
    }
    public Order read(long id) {
        var rows = jdbc.queryForList("SELECT o.*,s.table_id,t.table_number FROM orders o JOIN table_sessions s ON s.table_session_id=o.table_session_id JOIN cafe_tables t ON t.table_id=s.table_id WHERE o.order_id=? AND o.fulfillment_type='DINE_IN'",id);
        if (rows.isEmpty()) throw new OrderProblem(404,"Không tìm thấy đơn tại bàn.");
        var r = rows.get(0);
        List<Item> items = jdbc.query("SELECT i.*,m.item_name FROM order_items i JOIN menu_items m ON m.menu_item_id=i.menu_item_id WHERE i.order_id=? ORDER BY i.order_item_id",(rs,n) -> new Item(rs.getLong("order_item_id"),rs.getLong("menu_item_id"),rs.getString("item_name"),rs.getInt("quantity"),rs.getLong("unit_price"),rs.getString("size_name"),rs.getLong("size_price"),rs.getString("sugar_level"),rs.getString("ice_level"),extras(rs.getString("topping_details")),rs.getLong("topping_price"),rs.getString("note"),rs.getString("item_status"),rs.getLong("subtotal")),id);
        String revision = OrderingService.hash(encode(List.of(r,items)));
        return new Order(id,(String)r.get("order_number"),((Number)r.get("table_id")).longValue(),(String)r.get("table_number"),((Number)r.get("table_session_id")).longValue(),(String)r.get("status"),(String)r.get("order_source"),(String)r.get("customer_note"),((Number)r.get("total_amount")).longValue(),String.valueOf(r.get("created_at")),String.valueOf(r.get("updated_at")),(String)r.get("cancel_reason"),items,revision);
    }
    private List<Extra> extras(String value) {
        if (value==null) return List.of();
        try { return json.readValue(value,new TypeReference<List<Extra>>(){}); }
        catch(Exception e) { throw new OrderProblem(409,"Định dạng topping của đơn chưa tương thích với hợp đồng dữ liệu chung."); }
    }
    public String encode(Object value) { try { return json.writeValueAsString(value); } catch(Exception e) { throw new IllegalStateException(e); } }
}
