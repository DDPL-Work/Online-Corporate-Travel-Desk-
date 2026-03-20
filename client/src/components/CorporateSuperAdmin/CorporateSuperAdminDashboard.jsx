export default function CorporateSuperAdminDashboard() {
  const stats = [
    { label: "Total Bookings", value: 128 },
    { label: "Active Employees", value: 42 },
    { label: "Pending Approvals", value: 6 },
    { label: "Monthly Spend", value: "₹2,45,000" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">
        Corporate Dashboard
      </h1>

      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl shadow border border-slate-100"
          >
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow border border-slate-100">
        <h2 className="font-semibold mb-4 text-slate-700">
          Recent Activity
        </h2>
        <ul className="space-y-3 text-sm text-slate-600">
          <li>• John Doe booked a flight to Dubai</li>
          <li>• Finance team updated billing details</li>
          <li>• 3 new employees added</li>
        </ul>
      </div>
    </div>
  );
}