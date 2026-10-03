package com.example.project.ordering;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static com.example.project.ordering.OrderDtos.*;

@Service
public class OrderingService {
    private final OrderingRepository repo;
    private final Options options;
    public OrderingService(OrderingRepository repo, @Value("${app.ordering.large-size-price}") long size,
        @Value("${app.ordering.espresso-price}") long espresso, @Value("${app.ordering.milk-foam-price}") long foam) {
        this.repo=repo; this.options=new Options(size,List.of(new Extra("Thêm espresso",espresso),new Extra("Kem sữa",foam)));
        if(size<0 || espresso<0 || foam<0) throw new IllegalArgumentException("Option prices cannot be negative");
    }
    public Options options() { return options; }
    public List<Drink> menu() { return repo.menu(); }
    public List<CafeTable> tables() { return repo.tables(); }
    public CafeTable table(long id) { return repo.table(id); }
    public CafeTable qr(String code) {
        var rows=repo.db().queryForList("SELECT table_id FROM cafe_tables WHERE qr_code=? AND is_active=TRUE",code);
        if(rows.isEmpty()) throw new OrderProblem(404,"Mã QR bàn không hợp lệ.");
        var table=repo.table(((Number)rows.get(0).get("table_id")).longValue());
        if(table.status().equals("UNAVAILABLE")) throw new OrderProblem(409,"Bàn đang tạm ngừng phục vụ.");
        return table;
    }
    @Transactional(readOnly=true)
    public List<Order> list(Set<Long> owned, boolean staff) {
        if(!staff && owned.isEmpty()) return List.of();
        List<Long> ids;
        if(staff) ids=repo.db().queryForList("SELECT order_id FROM orders WHERE fulfillment_type='DINE_IN' ORDER BY created_at DESC,order_id DESC LIMIT 200",Long.class);
        else {
            String marks=String.join(",",Collections.nCopies(owned.size(),"?"));
            ids=repo.db().queryForList("SELECT order_id FROM orders WHERE fulfillment_type='DINE_IN' AND order_id IN ("+marks+") ORDER BY created_at DESC,order_id DESC LIMIT 200",Long.class,owned.toArray());
        }
        return ids.stream().map(repo::read).toList();
    }
    @Transactional
    public Order create(OrderInput input, Long staffId, Long qrTableId, String nonce) {
        if(staffId==null && !Objects.equals(qrTableId,input.tableId())) throw new OrderProblem(403,"Vui lòng quét mã QR đúng bàn trước khi đặt món.");
        // Lock a real table before opening/reusing a session; its unique generated active_table_id is a second guard.
        var tables=repo.db().queryForList("SELECT * FROM cafe_tables WHERE table_id=? FOR UPDATE",input.tableId());
        if(tables.isEmpty()) throw new OrderProblem(404,"Không tìm thấy bàn.");
        var table=tables.get(0);
        String number=(staffId==null ? "QR-" : "ST-")+hash(nonce+":"+input.requestKey()).substring(0,32);
        var previous=repo.db().queryForList("SELECT order_id,table_session_id FROM orders WHERE order_number=?",number);
        if(!previous.isEmpty()) {
            Order saved=repo.read(((Number)previous.get(0).get("order_id")).longValue());
            if(saved.tableId()!=input.tableId()) throw new OrderProblem(409,"Yêu cầu này đã được gửi cho bàn khác. Tải lại đơn hàng.");
            return saved;
        }
        if(!Boolean.TRUE.equals(table.get("is_active")) && !"1".equals(String.valueOf(table.get("is_active")))) throw new OrderProblem(409,"Bàn đã ngừng hoạt động.");
        if("UNAVAILABLE".equals(table.get("status"))) throw new OrderProblem(409,"Bàn đang tạm ngừng phục vụ.");
        var sessions=repo.db().queryForList("SELECT * FROM table_sessions WHERE active_table_id=? FOR UPDATE",input.tableId());
        long session;
        if(sessions.isEmpty()) {
            session=repo.insert("INSERT INTO table_sessions(table_id,session_code,status) VALUES(?,?,'OPEN')",input.tableId(),"TS-"+UUID.randomUUID().toString().replace("-",""));
        } else {
            if(!"OPEN".equals(sessions.get(0).get("status"))) throw new OrderProblem(409,"Bàn đang chờ thanh toán, chưa thể thêm đơn.");
            session=((Number)sessions.get(0).get("table_session_id")).longValue();
        }
        List<Item> priced=price(input.items());
        long total=priced.stream().mapToLong(Item::subtotal).reduce(0,Math::addExact);
        long id=repo.insert("INSERT INTO orders(created_by_user_id,table_session_id,order_number,order_source,status,fulfillment_type,customer_note,total_amount) VALUES(?,?,?,?,'PENDING_CONFIRMATION','DINE_IN',?,?)",staffId,session,number,staffId==null ? "QR_TABLE":"STAFF",input.note(),total);
        saveItems(id,priced);
        repo.db().update("UPDATE cafe_tables SET status='OCCUPIED' WHERE table_id=?",input.tableId());
        return repo.read(id);
    }
    @Transactional
    public Order update(long id,OrderInput input) {
        var row=repo.lockOrder(id); pending(row);
        var current=repo.read(id);
        if(!Objects.equals(current.revision(),input.revision())) throw new OrderProblem(409,"Đơn đã thay đổi. Vui lòng tải lại trước khi sửa.");
        if(current.tableId()!=input.tableId()) throw new OrderProblem(400,"Không chuyển bàn khi chỉnh sửa đơn. Đơn phải giữ đúng phiên bàn.");
        List<Item> items=price(input.items());
        // Only unaccepted order lines may be replaced; accepted/history orders never enter this branch.
        repo.db().update("DELETE FROM order_items WHERE order_id=?",id);
        saveItems(id,items);
        repo.db().update("UPDATE orders SET customer_note=?,total_amount=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?",input.note(),items.stream().mapToLong(Item::subtotal).reduce(0,Math::addExact),id);
        return repo.read(id);
    }
    @Transactional
    public Order cancel(long id,CancelInput input,Set<Long> owned,boolean staff) {
        if(!staff && !owned.contains(id)) throw new OrderProblem(404,"Không tìm thấy đơn hàng.");
        var row=repo.lockOrder(id); pending(row);
        if(!Objects.equals(repo.read(id).revision(),input.revision())) throw new OrderProblem(409,"Đơn đã thay đổi. Vui lòng tải lại trước khi hủy.");
        repo.db().update("UPDATE orders SET status='CANCELLED',cancel_reason=?,cancelled_at=CURRENT_TIMESTAMP WHERE order_id=?",input.reason(),id);
        repo.db().update("UPDATE order_items SET item_status='CANCELLED' WHERE order_id=?",id);
        return repo.read(id);
    }
    private void pending(Map<String,Object> order) {
        if(!"PENDING_CONFIRMATION".equals(order.get("status"))) throw new OrderProblem(409,"Chỉ được sửa hoặc hủy đơn đang chờ xác nhận.");
        if(!"DINE_IN".equals(order.get("fulfillment_type"))) throw new OrderProblem(400,"Chức năng này chỉ xử lý đơn tại bàn.");
        var sessions=repo.db().queryForList("SELECT status FROM table_sessions WHERE table_session_id=? FOR UPDATE",order.get("table_session_id"));
        if(sessions.isEmpty() || !"OPEN".equals(sessions.get(0).get("status"))) throw new OrderProblem(409,"Phiên bàn đang thanh toán hoặc đã kết thúc.");
        Long count=repo.db().queryForObject("SELECT COUNT(*) FROM order_items WHERE order_id=? AND item_status<>'PENDING'",Long.class,order.get("order_id"));
        if(count!=null && count>0) throw new OrderProblem(409,"Có món đã được xử lý, không thể sửa hoặc hủy đơn.");
    }
    private List<Item> price(List<ItemInput> inputs) {
        List<Item> out=new ArrayList<>();
        // Fixed lock order avoids deadlocks when two orders contain the same drinks in different order.
        Map<Long,Map<String,Object>> drinks=new HashMap<>();
        inputs.stream().map(ItemInput::drinkId).distinct().sorted().forEach(id -> {
            var rows=repo.db().queryForList("SELECT m.*,c.status category_status FROM menu_items m JOIN categories c ON c.category_id=m.category_id WHERE m.menu_item_id=? FOR SHARE",id);
            if(rows.isEmpty()) throw new OrderProblem(400,"Món không tồn tại.");
            drinks.put(id,rows.get(0));
        });
        for(var input:inputs) {
            var drink=drinks.get(input.drinkId());
            if(!"ACTIVE".equals(drink.get("category_status")) || !"AVAILABLE".equals(drink.get("availability_status"))) throw new OrderProblem(409,drink.get("item_name")+" không còn bán. Vui lòng chọn món khác.");
            if(!Set.of("M","L").contains(input.size()) || !Set.of("0%","50%","100%").contains(input.sugar()) || !Set.of("Không đá","Ít đá","Bình thường").contains(input.ice())) throw new OrderProblem(400,"Tùy chọn món không hợp lệ.");
            if(new HashSet<>(input.extras()).size()!=input.extras().size()) throw new OrderProblem(400,"Không được lặp topping.");
            List<Extra> extras=input.extras().stream().map(name -> options.extras().stream().filter(e -> e.name().equals(name)).findFirst().orElseThrow(() -> new OrderProblem(400,"Topping không hợp lệ."))).toList();
            long base=((Number)drink.get("base_price")).longValue();
            long size=input.size().equals("L") ? options.largeSizePrice():0;
            long extra=extras.stream().mapToLong(Extra::price).sum();
            long subtotal=Math.multiplyExact(input.quantity(),Math.addExact(base,Math.addExact(size,extra)));
            out.add(new Item(0,input.drinkId(),(String)drink.get("item_name"),input.quantity(),base,input.size(),size,input.sugar(),input.ice(),extras,extra,input.note(),"PENDING",subtotal));
        }
        return out;
    }
    private void saveItems(long orderId,List<Item> items) {
        for(var i:items) repo.db().update("INSERT INTO order_items(order_id,menu_item_id,quantity,unit_price,sugar_level,ice_level,size_name,size_price,topping_details,topping_price,note,item_status,subtotal) VALUES(?,?,?,?,?,?,?,?,?,?,?,'PENDING',?)",orderId,i.drinkId(),i.quantity(),i.basePrice(),i.sugar(),i.ice(),i.size(),i.sizePrice(),repo.encode(i.extras()),i.toppingPrice(),i.note(),i.subtotal());
    }
    public static String hash(String input) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8))); }
        catch(Exception e) { throw new IllegalStateException(e); }
    }
}
