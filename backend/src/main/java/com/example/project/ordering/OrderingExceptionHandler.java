package com.example.project.ordering;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Map;

@RestControllerAdvice(basePackageClasses = OrderingController.class)
public class OrderingExceptionHandler {
    @ExceptionHandler(OrderProblem.class) public ResponseEntity<?> problem(OrderProblem e) { return ResponseEntity.status(e.status).body(Map.of("message",e.getMessage())); }
    @ExceptionHandler({ConcurrencyFailureException.class,DataIntegrityViolationException.class})
    public ResponseEntity<?> conflict(Exception e) { return ResponseEntity.status(409).body(Map.of("message","Dữ liệu vừa thay đổi hoặc không còn hợp lệ. Vui lòng tải lại và thử lại.")); }
}
