import axios from "axios";

const API = axios.create({
  baseURL: "http://backend-service:3000/api",
  withCredentials: true
});

export default API;