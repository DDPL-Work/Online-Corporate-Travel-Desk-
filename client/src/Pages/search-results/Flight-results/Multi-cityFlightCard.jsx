export default function MultiCityFlightCard({ segments = [] }) {
  const [openIndex, setOpenIndex] = useState(0);

  if (!segments.length) return null;

  return (
    <div className="max-w-[1060px] bg-white border rounded-lg p-4 shadow-sm">
      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full">
        Multi-City ({segments.length} Flights)
      </span>

      {segments.map((leg, i) => {
        const seg = leg[0]; // each leg is an array

        return (
          <div key={i} className="mt-4">
            <button
              onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
              className="flex justify-between w-full"
            >
              <span className="text-blue-600 font-semibold">
                Flight {i + 1}: {seg.Origin.Airport.AirportCode} →{" "}
                {seg.Destination.Airport.AirportCode}
              </span>
              {openIndex === i ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {openIndex === i && (
              <div className="mt-3">
                <div className="flex justify-between">
                  <div>
                    <div className="font-bold">
                      {new Date(seg.Origin.DepTime).toLocaleTimeString()}
                    </div>
                    <div className="text-slate-500">
                      {seg.Origin.Airport.AirportCode}
                    </div>
                  </div>

                  <MdOutlineFlight className="text-blue-600 rotate-90" />

                  <div>
                    <div className="font-bold">
                      {new Date(seg.Destination.ArrTime).toLocaleTimeString()}
                    </div>
                    <div className="text-slate-500">
                      {seg.Destination.Airport.AirportCode}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-between items-center border-t pt-3 mt-4">
        <div className="text-2xl font-bold">
          ₹{segments[0][0].Fare.PublishedFare.toLocaleString()}
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold">
          Select Flights
        </button>
      </div>
    </div>
  );
}
