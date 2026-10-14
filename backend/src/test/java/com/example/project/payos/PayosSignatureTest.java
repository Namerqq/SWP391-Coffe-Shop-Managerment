package com.example.project.payos;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kiểm tra chữ ký bằng dữ liệu mẫu chính thức của payOS
 * (https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature). Không cần DB hay key thật.
 */
class PayosSignatureTest {

    private static final String SAMPLE_KEY = "1a54716c8f0efb2744fb28b6e38b25da7f67a925d98bc1c18bd8faaecadd7675";
    private static final String SAMPLE_SIGNATURE = "412e915d2871504ed31be63c8f62a149a4410d34c4c42affc9006ef9917eaa03";

    private static Map<String, Object> sampleWebhookData() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("orderCode", 123);
        d.put("amount", 3000);
        d.put("description", "VQRIO123");
        d.put("accountNumber", "12345678");
        d.put("reference", "TF230204212323");
        d.put("transactionDateTime", "2023-02-04 18:25:00");
        d.put("currency", "VND");
        d.put("paymentLinkId", "124c33293c43417ab7879e14c8d9eb18");
        d.put("code", "00");
        d.put("desc", "Thành công");
        d.put("counterAccountBankId", "");
        d.put("counterAccountBankName", "");
        d.put("counterAccountName", "");
        d.put("counterAccountNumber", "");
        d.put("virtualAccountName", "");
        d.put("virtualAccountNumber", "");
        return d;
    }

    @Test
    void webhookSignatureMatchesPayosSample() {
        assertEquals(SAMPLE_SIGNATURE, PayosSignature.forData(sampleWebhookData(), SAMPLE_KEY));
        assertTrue(PayosSignature.matches(sampleWebhookData(), SAMPLE_SIGNATURE.toUpperCase(), SAMPLE_KEY));
    }

    @Test
    void tamperedDataIsRejected() {
        Map<String, Object> d = sampleWebhookData();
        d.put("amount", 3001);
        assertFalse(PayosSignature.matches(d, SAMPLE_SIGNATURE, SAMPLE_KEY));
        assertFalse(PayosSignature.matches(sampleWebhookData(), SAMPLE_SIGNATURE, "khoa-sai"));
    }

    @Test
    void createLinkSignatureUsesFiveSortedFields() {
        String expected = PayosSignature.hmacSha256(
                "amount=2000&cancelUrl=http://x/c&description=GC0000001&orderCode=1&returnUrl=http://x/r", "k");
        assertEquals(expected, PayosSignature.forCreateLink(2000, "http://x/c", "GC0000001", 1, "http://x/r", "k"));
    }

    @Test
    void nullAndTextNullBecomeEmpty() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("b", null);
        d.put("a", "null");
        d.put("c", 5.0);
        assertEquals("a=&b=&c=5", PayosSignature.canonical(d));
    }
}
