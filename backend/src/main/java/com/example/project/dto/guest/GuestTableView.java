package com.example.project.dto.guest;

/** Phiên gọi món của khách: token gửi lại ở header X-Guest-Token + bàn đang ngồi. */
public record GuestTableView(String token, Long tableId, String tableNumber) {}
