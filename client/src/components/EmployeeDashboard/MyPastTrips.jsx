import React from "react";
import { myPastTrips } from "../../data/dummyData";
import { FiCalendar, FiMapPin, FiStar } from "react-icons/fi";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function MyPastTrips() {
  const count = myPastTrips.length;
  const totalCost = myPastTrips.reduce((sum, t) => sum + t.cost, 0);

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>

      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.dark }}>
        My Past Trips
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

        <SummaryCard
          title="Total Past Trips"
          value={count}
          color={colors.primary}
        />

        <SummaryCard
          title="Total Spent"
          value={`₹${totalCost.toLocaleString()}`}
          color={colors.secondary}
        />

      </div>

      {myPastTrips.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">No past trips found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myPastTrips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-lg shadow p-5 flex flex-col gap-3 border-l-4"
              style={{ borderColor: colors.primary }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{trip.type === "Flight" ? "✈️ Flight" : "🏨 Hotel"}</h2>

                <div className="flex items-center gap-1 text-yellow-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FiStar
                      key={s}
                      size={18}
                      className={s <= trip.rating ? "text-yellow-500" : "text-gray-300"}
                    />
                  ))}
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-center gap-2 text-gray-600">
                <FiMapPin />
                <span>{trip.destination}</span>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-2 text-gray-600">
                <FiCalendar />
                <span>
                  {trip.startDate} → {trip.endDate}
                </span>
              </div>

              {/* Cost */}
              <p className="text-sm font-semibold text-[#088395]">Cost: ₹{trip.cost.toLocaleString()}</p>

              {/* Description */}
              <p className="text-gray-600 text-sm">{trip.notes}</p>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// Summary Card Component
function SummaryCard({ title, value, color }) {
  return (
    <div
      className="bg-white shadow rounded-lg p-6 flex items-center justify-between border-l-4"
      style={{ borderColor: color }}
    >
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <h3 className="text-3xl font-bold mt-1" style={{ color }}>
          {value}
        </h3>
      </div>
    </div>
  );
}
