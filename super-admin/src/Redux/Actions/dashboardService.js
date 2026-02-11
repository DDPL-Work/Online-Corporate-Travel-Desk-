import api from "../../API/axios";

/**
 * Fetch dashboard data based on role
 */
export const fetchDashboardDataAPI = async (role) => {
  let endpoint = "";

  switch (role) {
    case "employee":
      endpoint = "/dashboard/employee";
      break;

    case "travel-admin":
      endpoint = "/dashboard/travel-admin";
      break;

    case "super-admin":
      endpoint = "/dashboard/super-admin";
      break;

    default:
      throw new Error("Invalid role for dashboard");
  }

  const res = await api.get(endpoint);
  return res.data;
};
