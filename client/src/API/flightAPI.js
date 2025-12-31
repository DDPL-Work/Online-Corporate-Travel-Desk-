import axios from "axios";

const flightApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + "/flights",
  withCredentials: true
});

flightApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default flightApi;
