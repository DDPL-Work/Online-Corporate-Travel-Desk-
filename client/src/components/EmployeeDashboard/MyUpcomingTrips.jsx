import React from "react";
import { myUpcomingTrips } from "../../data/dummyData";
import { FiCalendar, FiMapPin, FiArrowRightCircle } from "react-icons/fi";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function MyUpcomingTrips() {
  const sortedTrips = [...myUpcomingTrips].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.dark }}>
        My Upcoming Trips
      </h1>

      {sortedTrips.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">No upcoming trips</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedTrips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-lg shadow p-5 flex flex-col gap-3 border-l-4"
              style={{ borderColor: colors.primary }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold" style={{ color: colors.dark }}>
                  {trip.type === "Flight" ? "✈️ Flight" : "🏨 Hotel"} Trip
                </h2>

                <span
                  className={`px-3 py-1 text-xs rounded-full font-medium 
                  ${
                    trip.status === "Confirmed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {trip.status}
                </span>
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

              {/* Footer */}
              <div className="flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">
                  View Details <FiArrowRightCircle />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
