import { request } from "./cafeClient";
export const getSession = () => request("/context");
export const loginStaff = (username, password) =>
  request("/staff/login", { method: "POST", body: { username, password } });
export const logoutStaff = () => request("/staff/logout", { method: "POST" });
