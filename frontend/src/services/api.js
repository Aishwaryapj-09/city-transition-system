import axios from "axios";

const API = axios.create({
  baseURL: "http://backend-service:5000/api",
  withCredentials: true
});

export default API;