export default function CorporateTotalBookings() {
  const bookings = [
    { date: "12 Jan 2026", employee: "John Doe", type: "Flight", amount: 450 },
    { date: "18 Jan 2026", employee: "Priya Sharma", type: "Hotel", amount: 320 },
    { date: "25 Jan 2026", employee: "Rahul Mehta", type: "Flight", amount: 680 },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">
        Corporate Total Bookings
      </h1>

      <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-teal-700 to-blue-600 text-white">
            <tr>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Employee</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b, i) => (
              <tr key={i} className="border-t">
                <td className="p-4">{b.date}</td>
                <td className="p-4">{b.employee}</td>
                <td className="p-4">{b.type}</td>
                <td className="p-4 text-right font-semibold text-blue-600">
                  ₹{b.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}