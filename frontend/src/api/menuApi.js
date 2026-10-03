import { request } from "./cafeClient";
export const getMenu = () => request("/menu");
export const getOptions = () => request("/options");
