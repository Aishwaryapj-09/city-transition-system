import axios from "axios";

const API = axios.create({
  baseURL: window.location.hostname === "localhost"
    ? "http://localhost:30008/api"
    : "/api",
  withCredentials: true
});

export default API;