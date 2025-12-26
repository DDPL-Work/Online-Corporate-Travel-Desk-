import api from "../../API/axios";

export const logoutAPI = async () => {
  await api.post("/api/v1/auth/sso/logout");
};
