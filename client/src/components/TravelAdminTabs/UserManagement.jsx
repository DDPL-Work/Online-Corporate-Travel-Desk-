import React, { useState } from "react";
import { FiSearch, FiUserPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { usersData } from "../../data/dummyData";
import CreateUserModal from "../../Modal/CreateUserModal";
import EditUserModal from "../../Modal/EditUserModal";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function UserManagement() {
  const [users, setUsers] = useState(usersData);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const departments = ["All", ...new Set(users.map((u) => u.department))];

  function handleCreate(newUser) {
    setUsers((prev) => [...prev, { id: Date.now(), ...newUser }]);
    setOpenCreate(false);
  }

  function handleEdit(updatedUser) {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    setOpenEdit(false);
  }

  function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  // FILTER USERS
  const filteredUsers = users.filter((u) => {
    const matchName = u.name.toLowerCase().includes(search.toLowerCase());
    const matchDept =
      departmentFilter === "All" || u.department === departmentFilter;

    return matchName && matchDept;
  });

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold" style={{ color: colors.dark }}>
              User Management
            </h2>
            <p className="text-gray-500">Manage employees, add or update users</p>
          </div>

          <button
            onClick={() => setOpenCreate(true)}
            className="flex items-center gap-2 px-5 py-2 rounded text-white font-medium shadow"
            style={{ backgroundColor: colors.primary }}
          >
            <FiUserPlus /> Add User
          </button>
        </div>

        {/* SEARCH + FILTERS */}
        <div className="bg-white shadow p-4 rounded-lg mb-6 flex flex-col md:flex-row gap-4 justify-between">
          {/* Search */}
          <div className="flex items-center gap-2 border p-2 rounded-lg w-full md:w-1/2">
            <FiSearch className="text-gray-500" />
            <input
              placeholder="Search by name or email"
              className="w-full outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Department Filter */}
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

        {/* USER LIST */}
        <div className="bg-white rounded-lg shadow p-4">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No users found</p>
          ) : (
            <ul className="space-y-4">
              {filteredUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex justify-between items-center p-4 rounded-lg border hover:shadow transition"
                >
                  {/* USER DETAILS */}
                  <div>
                    <div
                      className="font-semibold text-lg"
                      style={{ color: colors.primary }}
                    >
                      {u.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {u.email} • {u.department}
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setOpenEdit(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FiEdit2 size={20} />
                    </button>

                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FiTrash2 size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* MODALS */}
        {openCreate && (
          <CreateUserModal
            onClose={() => setOpenCreate(false)}
            onSave={handleCreate}
          />
        )}

        {openEdit && selectedUser && (
          <EditUserModal
            onClose={() => setOpenEdit(false)}
            onSave={handleEdit}
            user={selectedUser}
          />
        )}
      </div>
    </div>
  );
}
