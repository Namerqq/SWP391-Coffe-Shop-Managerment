package com.example.project.ordering;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.*;
import static com.example.project.ordering.OrderDtos.*;

@RestController
@RequestMapping("/api/cafe")
public class OrderingController {
    private final OrderingService service;
    private final OrderAccess access;
    @Value("${app.ordering.fixed-table-qr:}") private String fixedTableQr;
    @Value("${app.ordering.staff-login-enabled:false}") private boolean staffLoginEnabled;
    public OrderingController(OrderingService service,OrderAccess access) { this.service=service;this.access=access; }
    @GetMapping("/menu") public List<Drink> menu() { return service.menu(); }
    @GetMapping("/options") public Options options() { return service.options(); }
    @GetMapping("/context") public Map<String,Object> context(HttpSession session) {
        Map<String,Object> out=new HashMap<>();
        boolean fixedTable=!fixedTableQr.isBlank();
        out.put("fixedTable",fixedTable);
        if(fixedTable) access.setTable(session,service.qr(fixedTableQr).id());
        if(access.tableId(session)!=null) { try { out.put("table",service.table(access.tableId(session))); } catch(OrderProblem e) { session.removeAttribute("qrTableId"); } }
        if(session.getAttribute("staffId")!=null) { try { out.put("staff",access.requireStaff(session)); } catch(OrderProblem e) { session.removeAttribute("staffId"); } }
        return out;
    }
    @PostMapping("/table-context") public CafeTable table(@Valid @RequestBody TableContext input,HttpSession session) {
        var table=service.qr(fixedTableQr.isBlank() ? input.qrCode() : fixedTableQr); access.setTable(session,table.id()); return table;
    }
    @PostMapping("/staff/login") public Staff login(@Valid @RequestBody Login input,HttpServletRequest request) {
        if(!staffLoginEnabled) throw new OrderProblem(404,"Đăng nhập nhân viên chưa thuộc phạm vi Iter 1.");
        Staff staff=access.login(input,request.getSession()); request.changeSessionId(); return staff;
    }
    @PostMapping("/staff/logout") public void logout(HttpSession session) { session.removeAttribute("staffId"); }
    @GetMapping("/tables") public List<CafeTable> tables(HttpSession session) { access.requireStaff(session); return service.tables(); }
    @GetMapping("/orders") public List<Order> orders(HttpSession session) { return service.list(access.owned(session),false); }
    @GetMapping("/staff/orders") public List<Order> staffOrders(HttpSession session) { access.requireStaff(session); return service.list(Set.of(),true); }
    @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED)
    public Order create(@Valid @RequestBody OrderInput input,HttpSession session) {
        Order order=service.create(input,null,access.tableId(session),access.nonce(session)); access.owned(session).add(order.id()); return order;
    }
    @PostMapping("/staff/orders") @ResponseStatus(HttpStatus.CREATED)
    public Order createStaff(@Valid @RequestBody OrderInput input,HttpSession session) {
        var staff=access.requireStaff(session); return service.create(input,staff.id(),null,access.nonce(session));
    }
    @PutMapping("/orders/{id}") public Order editCustomer(@PathVariable long id,@Valid @RequestBody OrderInput input,HttpSession session) {
        throw new OrderProblem(403,"Đơn đã gửi không được chỉnh sửa. Bạn chỉ có thể hủy khi đơn còn chờ xác nhận.");
    }
    @PutMapping("/staff/orders/{id}") public Order edit(@PathVariable long id,@Valid @RequestBody OrderInput input,HttpSession session) {
        access.requireStaff(session); return service.update(id,input);
    }
    @PostMapping("/orders/{id}/cancel") public Order cancel(@PathVariable long id,@Valid @RequestBody CancelInput input,HttpSession session) {
        return service.cancel(id,input,access.owned(session),false);
    }
    @PostMapping("/staff/orders/{id}/cancel") public Order cancelStaff(@PathVariable long id,@Valid @RequestBody CancelInput input,HttpSession session) {
        access.requireStaff(session); return service.cancel(id,input,Set.of(),true);
    }
}
