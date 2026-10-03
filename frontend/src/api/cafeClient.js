export async function request(path, { method = "GET", body, signal } = {}) {
  const response = await fetch("/api/cafe" + path, {
    method,
    signal,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Cafe-Client": "web" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) {
    const e = new Error(
      data.message ||
        Object.values(data).join(" · ") ||
        (text.includes("Invalid CORS request")
          ? "Cổng giao diện chưa được backend cho phép. Kiểm tra CAFE_ALLOWED_ORIGINS và khởi động lại backend."
          : `Không thể thực hiện yêu cầu (HTTP ${response.status}). Vui lòng thử lại.`),
    );
    e.status = response.status;
    throw e;
  }
  return data;
}
