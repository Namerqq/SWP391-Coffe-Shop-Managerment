package com.example.project.dto.cashier;

import com.example.project.entity.MenuItem;
import com.example.project.entity.OrderItem;

import java.util.List;

/**
 * Giỏ hàng mang đi lưu kèm mã QR (cột cart_json). Lưu "ảnh chụp" giá lúc tạo mã để khi khách trả xong
 * đơn được tạo đúng số tiền trong mã QR, kể cả khi menu vừa đổi giá hoặc món vừa hết.
 */
public record QrTakeawayCart(String note, List<Line> lines) {

    public record Line(Long menuItemId, String itemName, Integer quantity, Long unitPrice, String sizeName,
                       Long sizePrice, String toppingDetails, Long toppingPrice, String sugarLevel, String iceLevel,
                       String note, Long subtotal) {

        public static Line of(OrderItem i) {
            return new Line(i.getMenuItem().getId(), i.getMenuItem().getName(), i.getQuantity(), i.getUnitPrice(),
                    i.getSizeName(), i.getSizePrice(), i.getToppingDetails(), i.getToppingPrice(), i.getSugarLevel(),
                    i.getIceLevel(), i.getNote(), i.getSubtotal());
        }

        /** Dựng lại dòng món của đơn từ ảnh chụp. */
        public OrderItem toOrderItem(MenuItem menuItem) {
            OrderItem i = new OrderItem();
            i.setMenuItem(menuItem);
            i.setQuantity(quantity);
            i.setUnitPrice(unitPrice);
            i.setSizeName(sizeName);
            i.setSizePrice(sizePrice == null ? 0L : sizePrice);
            i.setToppingDetails(toppingDetails);
            i.setToppingPrice(toppingPrice == null ? 0L : toppingPrice);
            i.setSugarLevel(sugarLevel);
            i.setIceLevel(iceLevel);
            i.setNote(note);
            i.setItemStatus(OrderItem.PENDING);
            i.recalcSubtotal();
            return i;
        }
    }

    public int itemCount() {
        return lines == null ? 0 : lines.stream().mapToInt(l -> l.quantity() == null ? 0 : l.quantity()).sum();
    }
}
