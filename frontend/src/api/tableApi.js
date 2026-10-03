import { request } from "./cafeClient";
export const getTables = (signal) => request("/tables", { signal });
export const selectCustomerTable = (qrCode) =>
  request("/table-context", { method: "POST", body: { qrCode } });
