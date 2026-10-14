package com.example.project.payos;

/** Lỗi khi làm việc với payOS: mất kết nối, payOS báo lỗi (code khác "00"), chữ ký webhook sai... */
public class PayosException extends RuntimeException {

    private final String code;

    public PayosException(String code, String message) {
        super(message);
        this.code = code;
    }

    public PayosException(String message, Throwable cause) {
        super(message, cause);
        this.code = null;
    }

    /** Mã lỗi payOS trả về (vd "231"), hoặc HTTP_xxx / null nếu lỗi kết nối. */
    public String getCode() { return code; }
}
