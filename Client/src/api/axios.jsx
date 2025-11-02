import axios from "axios";
const isLocal = window.location.hostname === "localhost";

const api = isLocal
  ? import.meta.env.VITE_API_URL_LOCAL
  : import.meta.env.VITE_API_URL_PROD;

export default axios.create({
  baseURL: api,
});