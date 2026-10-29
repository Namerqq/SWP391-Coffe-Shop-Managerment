package com.example.project.dto.cashier;

import java.util.List;

/** 1 trang danh sách khách thân thiết. page bắt đầu từ 0. */
public record LoyaltyCustomerPage(List<LoyaltyCustomerRow> items, int page, int size,
                                  long totalItems, int totalPages) {}
