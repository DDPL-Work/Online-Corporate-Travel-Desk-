import api from "../../API/axios";

export const logoutAPI = async () => {
  await api.post("/auth/sso/logout");
};
