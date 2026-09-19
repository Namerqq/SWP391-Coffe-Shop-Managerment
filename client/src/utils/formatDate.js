/**
 * utils/
 * Chứa các hàm dùng chung cho toàn bộ ứng dụng.
 */
export const formatDate = (date, locale = "vi-VN") => {
  if (!date) return "";
  return new Date(date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
