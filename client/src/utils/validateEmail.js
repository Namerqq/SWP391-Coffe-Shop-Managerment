/**
 * utils/
 * Chứa các hàm dùng chung cho toàn bộ ứng dụng.
 */
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(String(email).toLowerCase());
};
