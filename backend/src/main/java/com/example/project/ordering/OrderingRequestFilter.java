package com.example.project.ordering;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Set;

/** JSON mutations require a non-simple custom header; CORS only permits configured frontend origins. */
@Component
public class OrderingRequestFilter extends OncePerRequestFilter {
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        if(request.getRequestURI().startsWith("/api/cafe/") && !Set.of("GET","HEAD","OPTIONS").contains(request.getMethod()) && !"web".equals(request.getHeader("X-Cafe-Client"))) {
            response.setStatus(403);response.setContentType("application/json;charset=UTF-8");response.getWriter().write("{\"message\":\"Yêu cầu phải được gửi từ giao diện Cafe Shop.\"}"); return;
        }
        chain.doFilter(request,response);
    }
}
