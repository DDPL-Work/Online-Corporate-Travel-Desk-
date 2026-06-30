// super-admin/src/API/opsAPI.js

import api from "./axios";

export const createOpsMember = async (data) => {
  const response = await api.post("/ops/create", data);
  return response.data;
};

export const listOpsMembers = async (params) => {
  const response = await api.get("/ops/list", { params });
  return response.data;
};

export const updateOpsMember = async (id, data) => {
  const response = await api.patch(`/ops/update/${id}`, data);
  return response.data;
};

export const updateOpsStatus = async (id, status) => {
  const response = await api.patch(`/ops/status/${id}`, { status });
  return response.data;
};

export const deleteOpsMember = async (id) => {
  const response = await api.delete(`/ops/delete/${id}`);
  return response.data;
};

export const resetOpsPassword = async (id, data) => {
  const response = await api.patch(`/ops/reset-password/${id}`, data);
  return response.data;
};
