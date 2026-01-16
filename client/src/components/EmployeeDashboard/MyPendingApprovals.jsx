import React, { useEffect, useMemo } from "react";
import { FiCalendar, FiMapPin, FiArrowRightCircle } from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookingRequests } from "../../Redux/Actions/booking.thunks";
import { useNavigate } from "react-router-dom";

const colors = {
  primary: "#0A4D68",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function MyPendingApprovals() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { myRequests, loading } = useSelector((state) => state.bookings);

  const user = useSelector((state) => state.auth.user); // 🔑 logged-in user

  useEffect(() => {
    dispatch(fetchMyBookingRequests());
  }, [dispatch]);

  const myTrips = useMemo(() => {
    return (myRequests || [])
      .map((b) => {
        const segments = b.flightRequest?.segments || [];
        const first = segments[0];
        const last = segments[segments.length - 1];

        return {
          id: b._id,
          status: b.requestStatus,
          destination: segments.length
            ? `${first?.origin?.city || "N/A"} → ${
                last?.destination?.city || "N/A"
              }`
            : "N/A",
          startDate: first?.departureDateTime,
          endDate: last?.arrivalDateTime,
        };
      })
      .filter((t) => t.startDate)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [myRequests]);

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">Loading your trips…</div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.dark }}>
        My Flight Requests
      </h1>

      {myTrips.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">
          No flight requests found
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myTrips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-lg shadow p-5 flex flex-col gap-3 border-l-4"
              style={{ borderColor: colors.primary }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FaPlane /> Flight Request
                </h2>

                <span
                  className={`px-3 py-1 text-xs rounded-full font-medium ${
                    trip.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : trip.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {trip.status.replace("_", " ").toUpperCase()}
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
                  {new Date(trip.startDate).toLocaleDateString()} →{" "}
                  {new Date(trip.endDate).toLocaleDateString()}
                </span>
              </div>

              {/* Footer */}
              <div className="flex justify-end">
                <button
                  onClick={() => navigate(`/bookings/${trip.id}/book`)}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                >
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
