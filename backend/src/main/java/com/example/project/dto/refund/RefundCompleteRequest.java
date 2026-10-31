package com.example.project.dto.refund;

import jakarta.validation.constraints.Size;

/** Thu ngân đã chuyển khoản trả khách: nhập mã giao dịch trên app ngân hàng. */
public record RefundCompleteRequest(
        @Size(max = 100, message = "Mã giao dịch tối đa 100 ký tự") String bankReference
) {}
