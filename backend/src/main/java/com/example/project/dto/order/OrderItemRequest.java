package com.example.project.dto.order;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** 1 món gửi lên khi tạo / sửa đơn. sizeId, toppingIds là id món trong danh mục "Size" / "Topping". */
public record OrderItemRequest(
        @NotNull(message = "Thiếu món") Long menuItemId,
        @NotNull(message = "Thiếu số lượng") @Min(value = 1, message = "Số lượng tối thiểu là 1")
        @Max(value = 50, message = "Số lượng tối đa là 50") Integer quantity,
        Long sizeId,
        List<Long> toppingIds,
        @Size(max = 30) String sugarLevel,
        @Size(max = 30) String iceLevel,
        @Size(max = 300, message = "Ghi chú tối đa 300 ký tự") String note
) {}
