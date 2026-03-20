export default function TravelAdminManagement() {
  const admins = [
    { name: "Karan Ahuja", role: "Corporate Super Admin", email: "contact@company.com" },
    { name: "Holidays Team", role: "Travel Admin", email: "holidays@company.com" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">
          Admin Management
        </h1>
        <button className="bg-gradient-to-r from-teal-700 to-blue-600 text-white px-4 py-2 rounded-xl">
          + Add Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a, i) => (
              <tr key={i} className="border-t">
                <td className="p-4">{a.name}</td>
                <td className="p-4 text-blue-600 font-semibold">{a.role}</td>
                <td className="p-4">{a.email}</td>
                <td className="p-4 text-right">
                  <button className="text-red-500 text-sm">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}