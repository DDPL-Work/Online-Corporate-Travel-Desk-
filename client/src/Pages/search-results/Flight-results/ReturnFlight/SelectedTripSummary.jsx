// SelectedTripSummary.jsx (Enhanced – MakeMyTrip Style)
import { MdOutlineFlight } from "react-icons/md";
import { airlineLogo, formatDate, formatTime } from "../../../../utils/formatter";





const getJourney = (flight) => {
  const segs = flight?.Segments?.[0];
  if (!segs || !segs.length) return null;

  const first = segs[0];
  const last = segs[segs.length - 1];

  return {
    airline: first.Airline.AirlineName,
    airlineCode: first.Airline.AirlineCode,
    flightNo: `${first.Airline.AirlineCode}-${first.Airline.FlightNumber}`,
    fromCode: first.Origin.Airport.AirportCode,
    toCode: last.Destination.Airport.AirportCode,
    depTime: first.Origin.DepTime,
    arrTime: last.Destination.ArrTime,
  };
};

export default function SelectedTripSummary({ onward, ret, onContinue }) {
  if (!onward) return null;

  const onwardData = getJourney(onward);
  const returnData = ret ? getJourney(ret) : null;

  const onwardFare = onward?.Fare?.PublishedFare || 0;
  const returnFare = ret?.Fare?.PublishedFare || 0;
  const totalFare = onwardFare + returnFare;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-10">
          {/* LEFT: FLIGHT DETAILS */}
          <div className="flex items-center gap-10 flex-1">
            {/* ONWARD */}
            {onwardData && (
              <div className="flex items-center gap-4">
                <img
                  src={airlineLogo(onwardData.airlineCode)}
                  alt={onwardData.airline}
                  className="w-9 h-9 object-contain"
                />

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span>{onwardData.fromCode}</span>
                    <MdOutlineFlight className="text-blue-600" />
                    <span>{onwardData.toCode}</span>
                  </div>

                  <div className="text-xs text-gray-500 mt-0.5">
                    {onwardData.airline} · {onwardData.flightNo}
                  </div>

                  <div className="text-xs text-gray-600 mt-0.5">
                    {formatDate(onwardData.depTime)} ·{" "}
                    {formatTime(onwardData.depTime)} –{" "}
                    {formatTime(onwardData.arrTime)}
                  </div>
                </div>
              </div>
            )}

            {/* DIVIDER */}
            {onwardData && returnData && (
              <div className="h-12 w-px bg-gray-300"></div>
            )}

            {/* RETURN */}
            {returnData ? (
              <div className="flex items-center gap-4">
                <img
                  src={airlineLogo(returnData.airlineCode)}
                  alt={returnData.airline}
                  className="w-9 h-9 object-contain"
                />

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span>{returnData.fromCode}</span>
                    <MdOutlineFlight className="text-green-600" />
                    <span>{returnData.toCode}</span>
                  </div>

                  <div className="text-xs text-gray-500 mt-0.5">
                    {returnData.airline} · {returnData.flightNo}
                  </div>

                  <div className="text-xs text-gray-600 mt-0.5">
                    {formatDate(returnData.depTime)} ·{" "}
                    {formatTime(returnData.depTime)} –{" "}
                    {formatTime(returnData.arrTime)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-orange-600 font-medium bg-orange-50 px-4 py-2 rounded-lg border border-orange-200">
                Select return flight to continue
              </div>
            )}
          </div>

          {/* RIGHT: PRICE + CTA */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-gray-500">Total price</div>
              <div className="text-2xl font-bold text-gray-900">
                ₹{totalFare.toLocaleString("en-IN")}
              </div>
            </div>

            <button
              disabled={!ret}
              onClick={onContinue}
              className="px-10 py-3 bg-orange-500 text-white text-lg font-bold rounded-lg
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:bg-orange-600 active:bg-orange-700 transition-all
                shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
