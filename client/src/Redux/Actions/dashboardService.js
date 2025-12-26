import api from "../../API/axios";

/**
 * Fetch dashboard data based on role
 */
export const fetchDashboardDataAPI = async (role) => {
  let endpoint = "";

  switch (role) {
    case "employee":
      endpoint = "/api/v1/dashboard/employee";
      break;

    case "travel-admin":
      endpoint = "/api/v1/dashboard/travel-admin";
      break;

    case "super-admin":
      endpoint = "/api/v1/dashboard/super-admin";
      break;

    default:
      throw new Error("Invalid role for dashboard");
  }

  const res = await api.get(endpoint);
  return res.data;
};
