export const money = (value) =>
  new Intl.NumberFormat("vi-VN").format(value) + "đ";
