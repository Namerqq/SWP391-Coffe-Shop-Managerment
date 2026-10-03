package com.example.project.ordering;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public final class OrderDtos {
    private OrderDtos() {}
    public record Drink(long id, long categoryId, String category, String name, String description, long price, String imageUrl, boolean available) {}
    public record CafeTable(long id, String name, String qrCode, String status, boolean active, Long sessionId, String sessionStatus, int pendingOrders, int activeOrders) {}
    public record Staff(long id, String name, String username, String role) {}
    public record Login(@NotBlank @Size(max=50) String username, @NotBlank @Size(max=100) String password) {}
    public record TableContext(@NotBlank @Size(max=255) String qrCode) {}
    public record ItemInput(@Positive long drinkId, @NotBlank String size, @NotBlank String sugar, @NotBlank String ice,
        @NotNull @Size(max=2) List<@NotBlank String> extras, @Min(1) @Max(50) int quantity, @Size(max=300) String note) {}
    public record OrderInput(@Positive long tableId, @Size(max=500) String note,
        @NotEmpty @Size(max=50) List<@NotNull @Valid ItemInput> items,
        @NotBlank @Pattern(regexp="[a-zA-Z0-9-]{20,64}") String requestKey, String revision) {}
    public record CancelInput(@NotBlank @Size(max=500) String reason, @NotBlank String revision) {}
    public record Extra(String name, long price) {}
    public record Item(long id, long drinkId, String name, int quantity, long basePrice, String size, long sizePrice,
        String sugar, String ice, List<Extra> extras, long toppingPrice, String note, String status, long subtotal) {}
    public record Order(long id, String number, long tableId, String tableName, long sessionId, String status,
        String source, String note, long total, String createdAt, String updatedAt, String cancelReason,
        List<Item> items, String revision) {}
    public record Options(long largeSizePrice, List<Extra> extras) {}
}
