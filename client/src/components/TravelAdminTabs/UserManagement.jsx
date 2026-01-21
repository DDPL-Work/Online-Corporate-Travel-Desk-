import React, { useEffect, useState } from "react";
import { FiSearch, FiEdit2, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchEmployees,
  deleteEmployee,
} from "../../Redux/Slice/employeeActionSlice";
import EditUserModal from "../../Modal/EditUserModal";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function UserManagement() {
  const dispatch = useDispatch();
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // ✅ CORRECT SELECTOR
  const { employees, loading, error } = useSelector(
    (state) => state.employeeAction,
  );

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  // -------------------------
  // FETCH EMPLOYEES
  // -------------------------
  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  // -------------------------
  // DELETE EMPLOYEE
  // -------------------------
  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?"))
      return;

    dispatch(deleteEmployee(id));
  };

  // -------------------------
  // FILTER LOGIC
  // -------------------------
  const departments = [
    "All",
    ...new Set(employees.map((e) => e.department).filter(Boolean)),
  ];

  const filteredEmployees = employees.filter((e) => {
    const name =
      typeof e.name === "string"
        ? e.name
        : `${e.name?.firstName || ""} ${e.name?.lastName || ""}`;

    const matchSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase());

    const matchDept =
      departmentFilter === "All" || e.department === departmentFilter;

    return matchSearch && matchDept;
  });

  // -------------------------
  // UI STATES
  // -------------------------
  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading employees…</div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold" style={{ color: colors.dark }}>
            User Management
          </h2>
          <p className="text-gray-500">Manage employees in your organization</p>
        </div>

        {/* SEARCH + FILTER */}
        <div className="bg-white shadow p-4 rounded-lg mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 border p-2 rounded-lg w-full md:w-1/2">
            <FiSearch className="text-gray-500" />
            <input
              placeholder="Search by name or email"
              className="w-full outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="border p-2 rounded-lg w-full md:w-1/4"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* EMPLOYEE LIST */}
        <div className="bg-white rounded-lg shadow p-4">
          {filteredEmployees.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No employees found</p>
          ) : (
            <ul className="space-y-4">
              {filteredEmployees.map((e) => {
                const fullName =
                  typeof e.name === "string"
                    ? e.name
                    : `${e.name?.firstName || ""} ${e.name?.lastName || ""}`;

                return (
                  <li
                    key={e._id}
                    className="flex justify-between items-center p-4 rounded-lg border hover:shadow"
                  >
                    <div>
                      <div
                        className="font-semibold text-lg"
                        style={{ color: colors.primary }}
                      >
                        {fullName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {e.email} • {e.department}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          setSelectedUser(e);
                          setOpenEdit(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiEdit2 size={20} />
                      </button>

                      <button
                        onClick={() => handleDelete(e._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 size={20} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {openEdit && selectedUser && (
        <EditUserModal user={selectedUser} onClose={() => setOpenEdit(false)} />
      )}
    </div>
  );
}
