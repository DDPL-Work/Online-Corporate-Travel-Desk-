export default function EmployeeManagement() {
  const employees = [
    { name: "John Doe", department: "Sales", status: "Active" },
    { name: "Priya Sharma", department: "Finance", status: "Inactive" },
    { name: "Rahul Mehta", department: "IT", status: "Active" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">
          Employee Management
        </h1>
        <button className="bg-gradient-to-r from-teal-700 to-blue-600 text-white px-4 py-2 rounded-xl">
          + Add Employee
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Department</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e, i) => (
              <tr key={i} className="border-t">
                <td className="p-4">{e.name}</td>
                <td className="p-4">{e.department}</td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      e.status === "Active"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-blue-600 text-sm">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}