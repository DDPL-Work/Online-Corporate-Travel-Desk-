import { useEffect, useState, useRef } from "react";
import { FaChevronDown, FaChevronUp, FaLeaf } from "react-icons/fa";

// Two-thumb range slider component
const RangeSlider = ({ min, max, values, onChange, formatValue }) => {
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null);

  // Ensure values is always defined and valid
  const safeValues = values || [min, max];
  const validValues = [
    Math.max(min, Math.min(max, safeValues[0] || min)),
    Math.max(min, Math.min(max, safeValues[1] || max)),
  ];

  const handleMouseDown = (index) => (e) => {
    e.preventDefault();
    setIsDragging(index);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (isDragging === null) return;

    const slider = sliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const percentage = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    const newValue = Math.round(min + percentage * (max - min));

    const newValues = [...validValues];

    if (isDragging === 0) {
      // Left thumb - can't go past right thumb
      newValues[0] = Math.min(newValue, validValues[1] - 1);
    } else {
      // Right thumb - can't go below left thumb
      newValues[1] = Math.max(newValue, validValues[0] + 1);
    }

    onChange(newValues);
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const leftPos = ((validValues[0] - min) / (max - min)) * 100;
  const rightPos = ((validValues[1] - min) / (max - min)) * 100;

  return (
    <div className="space-y-4">
      <div
        ref={sliderRef}
        className="relative h-2 bg-gray-200 rounded-full cursor-pointer"
        onMouseDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percentage = (e.clientX - rect.left) / rect.width;
          const newValue = Math.round(min + percentage * (max - min));

          // Determine which thumb to move based on click position
          const leftDistance = Math.abs(newValue - validValues[0]);
          const rightDistance = Math.abs(newValue - validValues[1]);

          if (leftDistance < rightDistance) {
            // Move left thumb
            onChange([Math.min(newValue, validValues[1] - 1), validValues[1]]);
          } else {
            // Move right thumb
            onChange([validValues[0], Math.max(newValue, validValues[0] + 1)]);
          }
        }}
      >
        {/* Selected range */}
        <div
          className="absolute h-2 bg-blue-500 rounded-full"
          style={{
            left: `${leftPos}%`,
            width: `${rightPos - leftPos}%`,
          }}
        />

        {/* Left thumb */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full -top-1 -ml-2 cursor-grab active:cursor-grabbing shadow-md"
          style={{ left: `${leftPos}%` }}
          onMouseDown={handleMouseDown(0)}
        />

        {/* Right thumb */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full -top-1 -ml-2 cursor-grab active:cursor-grabbing shadow-md"
          style={{ left: `${rightPos}%` }}
          onMouseDown={handleMouseDown(1)}
        />
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <span>
          {formatValue ? formatValue(validValues[0]) : validValues[0]}
        </span>
        <span>
          {formatValue ? formatValue(validValues[1]) : validValues[1]}
        </span>
      </div>
    </div>
  );
};

// Enhanced Flight Filters Component
const FlightFilterSidebar = ({
  flights = [],
  selectedStops,
  setSelectedStops,
  selectedTime,
  setSelectedTime,
  selectedAirlines,
  setSelectedAirlines,
  lowCO2,
  setLowCO2,
  selectedArrivalTime,
  setSelectedArrivalTime,
  selectedFlightNumbers,
  setSelectedFlightNumbers,
  selectedFareTypes,
  setSelectedFareTypes,
  selectedTerminals,
  setSelectedTerminals,
  selectedAirports,
  setSelectedAirports,
  selectedLayoverAirports,
  setSelectedLayoverAirports,
  selectedMaxDuration,
  setSelectedMaxDuration,
  popularFilters,
  setPopularFilters,
  priceValues,
  setPriceValues,
  durationValues,
  setDurationValues,
}) => {
  const [priceRange, setPriceRange] = useState({ min: 1000, max: 15000 });
  const [durationRange, setDurationRange] = useState({ min: 0, max: 1440 });
  const [priceType, setPriceType] = useState("incv");

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    popularFilters: false,
    stops: true,
    departureTime: true,
    arrivalTime: false,
    flightNumber: false,
    airlines: true,
    fareType: false,
    terminal: false,
    airport: false,
    layoverAirport: false,
    duration: false,
    environmental: true,
  });

  // Calculate price range from flights
  // useEffect(() => {
  //   if (!flights.length) return;

  //   const prices = flights
  //     .map((f) => f?.Fare?.PublishedFare || 0)
  //     .filter((p) => p > 0);

  //   if (!prices.length) return;

  //   const min = Math.floor(Math.min(...prices) / 100) * 100;
  //   const max = Math.ceil(Math.max(...prices) / 100) * 100;

  //   setPriceRange({ min, max });

  //   if (!priceValues || priceValues[1] === 70000) {
  //     setPriceValues([min, max]);
  //   }
  // }, [flights]);

  // // Calculate duration range
  // useEffect(() => {
  //   if (flights.length > 0) {
  //     const durations = flights
  //       .map((f) => getSegments(f)[0]?.Duration || 0)
  //       .filter(Boolean);

  //     if (durations.length > 0) {
  //       const minDur = Math.min(...durations);
  //       const maxDur = Math.max(...durations);
  //       setDurationRange({ min: minDur, max: maxDur });

  //       // Only set initial values if they haven't been set yet
  //       if (
  //         !durationValues ||
  //         (durationValues[0] === 0 && durationValues[1] === 1440)
  //       ) {
  //         setDurationValues([minDur, maxDur]);
  //         setSelectedMaxDuration(maxDur);
  //       }
  //     }
  //   }
  // }, [flights]);

  useEffect(() => {
  if (!flights.length) return;

  const prices = flights
    .map((f) => f?.Fare?.PublishedFare || 0)
    .filter(Boolean);

  if (!prices.length) return;

  const min = Math.floor(Math.min(...prices) / 100) * 100;
  const max = Math.ceil(Math.max(...prices) / 100) * 100;

  setPriceRange({ min, max });
}, [flights]);

useEffect(() => {
  if (!flights.length) return;

  const durations = flights
    .map((f) => getSegments(f)[0]?.Duration || 0)
    .filter(Boolean);

  if (!durations.length) return;

  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);

  setDurationRange({ min: minDur, max: maxDur });
}, [flights]);


  // Handle price range change
  const handlePriceChange = (newValues) => {
    setPriceValues(newValues);
    // setSelectedMaxPrice(newValues[1]); // Use the upper bound for filtering
  };

  // Handle duration range change
  const handleDurationChange = (newValues) => {
    setDurationValues(newValues);
    setSelectedMaxDuration(newValues[1]); // Use the upper bound for filtering
  };

  // Get unique flight numbers
  const getFlightNumbers = () => {
    const set = new Set();
    flights.forEach((f) => {
      getSegments(f).forEach((seg) => {
        if (seg?.Airline?.FlightNumber) {
          set.add(`${seg.Airline.AirlineCode}-${seg.Airline.FlightNumber}`);
        }
      });
    });
    return Array.from(set);
  };

  const getSegments = (flight) => {
    if (!flight?.Segments) return [];
    return Array.isArray(flight.Segments[0])
      ? flight.Segments.flat()
      : flight.Segments;
  };

  // Get unique terminals
  const getTerminals = () => {
    const terminals = new Set();

    flights.forEach((flight) => {
      getSegments(flight).forEach((seg) => {
        const depT = seg?.Origin?.Airport?.Terminal;
        const arrT = seg?.Destination?.Airport?.Terminal;

        if (depT) terminals.add(`Dep: ${depT}`);
        if (arrT) terminals.add(`Arr: ${arrT}`);
      });
    });

    return Array.from(terminals);
  };

  // Get unique airports
  const getAirports = () => {
    const map = new Map();

    flights.forEach((flight) => {
      getSegments(flight).forEach((seg) => {
        const dep = seg?.Origin?.Airport;
        const arr = seg?.Destination?.Airport;

        if (dep?.AirportCode) {
          map.set(dep.AirportCode, {
            code: dep.AirportCode,
            name: dep.AirportName || dep.CityName,
          });
        }

        if (arr?.AirportCode) {
          map.set(arr.AirportCode, {
            code: arr.AirportCode,
            name: arr.AirportName || arr.CityName,
          });
        }
      });
    });

    return Array.from(map.values());
  };

  // Get layover airports
  const getLayoverAirports = () => {
    const map = new Map();

    flights.forEach((flight) => {
      const segs = getSegments(flight);
      if (segs.length > 1) {
        for (let i = 0; i < segs.length - 1; i++) {
          const layover = segs[i]?.Destination?.Airport;
          if (layover?.AirportCode) {
            map.set(layover.AirportCode, {
              code: layover.AirportCode,
              name: layover.AirportName || layover.CityName,
            });
          }
        }
      }
    });

    return Array.from(map.values());
  };

  // Get fare types
  const getFareTypes = () => {
    const set = new Set();

    flights.forEach((f) => {
      if (f?.IsRefundable) set.add("Refundable");
      else set.add("Non-Refundable");

      if (f?.IsLCC) set.add("LCC");
      else set.add("Full Service");
    });

    return Array.from(set);
  };

  // Get airlines
  const getAirlines = () => {
    const map = new Map();

    flights.forEach((flight) => {
      getSegments(flight).forEach((seg) => {
        const airline = seg?.Airline;
        const price = flight?.Fare?.PublishedFare || 0;

        if (airline?.AirlineName) {
          if (
            !map.has(airline.AirlineName) ||
            price < map.get(airline.AirlineName).price
          ) {
            map.set(airline.AirlineName, {
              name: airline.AirlineName,
              code: airline.AirlineCode,
              price,
            });
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.price - b.price);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleStop = (option) => {
    setSelectedStops((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const toggleAirline = (airline) => {
    setSelectedAirlines((prev) =>
      prev.includes(airline)
        ? prev.filter((a) => a !== airline)
        : [...prev, airline]
    );
  };

  const toggleFlightNumber = (number) => {
    setSelectedFlightNumbers((prev) =>
      prev.includes(number)
        ? prev.filter((n) => n !== number)
        : [...prev, number]
    );
  };

  const toggleFareType = (type) => {
    setSelectedFareTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleTerminal = (terminal) => {
    setSelectedTerminals((prev) =>
      prev.includes(terminal)
        ? prev.filter((t) => t !== terminal)
        : [...prev, terminal]
    );
  };

  const toggleAirport = (code) => {
    setSelectedAirports((prev) =>
      prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]
    );
  };

  const toggleLayoverAirport = (code) => {
    setSelectedLayoverAirports((prev) =>
      prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]
    );
  };

  const togglePopularFilter = (filter) => {
    setPopularFilters((prev) => ({
      ...prev,
      [filter]: !prev[filter],
    }));
  };

  const resetAllFilters = () => {
    setPriceValues([priceRange.min, priceRange.max]);
    setDurationValues([durationRange.min, durationRange.max]);
    setSelectedMaxDuration(durationRange.max);
    setSelectedStops([]);
    setSelectedTime("");
    setSelectedArrivalTime("");
    setSelectedAirlines([]);
    setSelectedFlightNumbers([]);
    setSelectedFareTypes([]);
    setSelectedTerminals([]);
    setSelectedAirports([]);
    setSelectedLayoverAirports([]);
    setLowCO2(false);
    setPopularFilters({
      earlyMorning: false,
      refundable: false,
      directOnly: false,
      shortDuration: false,
    });
  };

  const times = [
    { label: "Morning", range: "06:00–12:00" },
    { label: "Afternoon", range: "12:00–18:00" },
    { label: "Evening", range: "18:00–00:00" },
    { label: "Night", range: "00:00–06:00" },
  ];

  const stopOptions = [
    {
      label: "Direct",
      count: flights.filter((f) => getSegments(f).length === 1).length,
    },
    {
      label: "1 stop",
      count: flights.filter((f) => getSegments(f).length === 2).length,
    },
    {
      label: "2+ stops",
      count: flights.filter((f) => getSegments(f).length > 2).length,
    },
  ];

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatPrice = (price) => `₹${price.toLocaleString()}`;

  const FilterSection = ({
    title,
    isExpanded,
    onToggle,
    children,
    clearText,
    onClear,
  }) => (
    <div className="border-b border-gray-200 pb-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={onToggle}
      >
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        <div className="flex items-center gap-2">
          {clearText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-blue-600 hover:text-blue-700 uppercase"
            >
              {clearText}
            </button>
          )}
          {isExpanded ? (
            <FaChevronUp className="text-gray-500 text-xs" />
          ) : (
            <FaChevronDown className="text-gray-500 text-xs" />
          )}
        </div>
      </div>
      {isExpanded && <div className="mt-3">{children}</div>}
    </div>
  );

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-md space-y-4 border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">Filters</h2>
        <button
          onClick={resetAllFilters}
          className="text-sm cursor-pointer text-blue-600 hover:text-blue-700 uppercase font-medium"
        >
          RESET
        </button>
      </div>

      {/* Price Filter */}
      <FilterSection
        title="Price"
        isExpanded={expandedSections.price}
        onToggle={() => toggleSection("price")}
        clearText="RESET"
        onClear={() => {
          setPriceValues([priceRange.min, priceRange.max]);
          // setSelectedMaxPrice(priceRange.max);
        }}
      >
        {priceRange.min === priceRange.max ? (
          <div className="text-center text-sm text-gray-500 py-2">
            All flights are {formatPrice(priceRange.min)}
          </div>
        ) : (
          <RangeSlider
            min={priceRange.min}
            max={priceRange.max}
            values={priceValues}
            onChange={handlePriceChange}
            formatValue={formatPrice}
          />
        )}
      </FilterSection>

      {/* Popular Filters */}
      <FilterSection
        title="Popular Filters"
        isExpanded={expandedSections.popularFilters}
        onToggle={() => toggleSection("popularFilters")}
      >
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={popularFilters.earlyMorning}
              onChange={() => togglePopularFilter("earlyMorning")}
              className="w-4 h-4 accent-blue-500"
            />
            <span>Early Morning (Before 8 AM)</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={popularFilters.refundable}
              onChange={() => togglePopularFilter("refundable")}
              className="w-4 h-4 accent-blue-500"
            />
            <span>Refundable</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={popularFilters.directOnly}
              onChange={() => togglePopularFilter("directOnly")}
              className="w-4 h-4 accent-blue-500"
            />
            <span>Direct Flights Only</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={popularFilters.shortDuration}
              onChange={() => togglePopularFilter("shortDuration")}
              className="w-4 h-4 accent-blue-500"
            />
            <span>Short Duration (&lt; 3hrs)</span>
          </label>
        </div>
      </FilterSection>

      {/* Stops */}
      <FilterSection
        title="Stops"
        isExpanded={expandedSections.stops}
        onToggle={() => toggleSection("stops")}
      >
        <div className="space-y-2">
          {stopOptions.map(({ label, count }) => (
            <label
              key={label}
              className="flex justify-between items-center text-sm cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedStops.includes(label)}
                  onChange={() => toggleStop(label)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span>{label}</span>
              </div>
              <span className="text-gray-500">({count})</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Departure Time */}
      <FilterSection
        title="Departure Time"
        isExpanded={expandedSections.departureTime}
        onToggle={() => toggleSection("departureTime")}
      >
        <div className="grid grid-cols-2 gap-2">
          {times.map((t) => (
            <div
              key={t.label}
              onClick={() =>
                setSelectedTime(selectedTime === t.label ? "" : t.label)
              }
              className={`border rounded px-2 py-2 text-xs text-center cursor-pointer transition ${
                selectedTime === t.label
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-[10px] mt-0.5">{t.range}</div>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Arrival Time */}
      <FilterSection
        title="Arrival Time"
        isExpanded={expandedSections.arrivalTime}
        onToggle={() => toggleSection("arrivalTime")}
      >
        <div className="grid grid-cols-2 gap-2">
          {times.map((t) => (
            <div
              key={t.label}
              onClick={() =>
                setSelectedArrivalTime(
                  selectedArrivalTime === t.label ? "" : t.label
                )
              }
              className={`border rounded px-2 py-2 text-xs text-center cursor-pointer transition ${
                selectedArrivalTime === t.label
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-[10px] mt-0.5">{t.range}</div>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Flight Number */}
      <FilterSection
        title="Flight Number"
        isExpanded={expandedSections.flightNumber}
        onToggle={() => toggleSection("flightNumber")}
        clearText="CLEAR"
        onClear={() => setSelectedFlightNumbers([])}
      >
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {getFlightNumbers().map((number) => (
            <label
              key={number}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedFlightNumbers.includes(number)}
                onChange={() => toggleFlightNumber(number)}
                className="w-4 h-4 accent-blue-500"
              />
              <span>{number}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Airlines */}
      <FilterSection
        title="Airlines"
        isExpanded={expandedSections.airlines}
        onToggle={() => toggleSection("airlines")}
        clearText="CLEAR"
        onClear={() => setSelectedAirlines([])}
      >
        <div className="space-y-2">
          {getAirlines().map(({ name, price }) => (
            <label
              key={name}
              className="flex justify-between items-center text-sm cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedAirlines.includes(name)}
                  onChange={() => toggleAirline(name)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-xs">{name}</span>
              </div>
              <span className="text-gray-500 text-xs">
                ₹{price.toLocaleString()}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Fare Type */}
      <FilterSection
        title="Fare Type"
        isExpanded={expandedSections.fareType}
        onToggle={() => toggleSection("fareType")}
      >
        <div className="space-y-2">
          {getFareTypes().map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedFareTypes.includes(type)}
                onChange={() => toggleFareType(type)}
                className="w-4 h-4 accent-blue-500"
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Terminal */}
      <FilterSection
        title="Terminal"
        isExpanded={expandedSections.terminal}
        onToggle={() => toggleSection("terminal")}
      >
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {getTerminals().map((terminal) => (
            <label
              key={terminal}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedTerminals.includes(terminal)}
                onChange={() => toggleTerminal(terminal)}
                className="w-4 h-4 accent-blue-500"
              />
              <span>{terminal}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Airport */}
      <FilterSection
        title="Airport"
        isExpanded={expandedSections.airport}
        onToggle={() => toggleSection("airport")}
      >
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {getAirports().map(({ code, name }) => (
            <label
              key={code}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedAirports.includes(code)}
                onChange={() => toggleAirport(code)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-xs">
                {code} - {name}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Layover Airport */}
      <FilterSection
        title="Layover Airport"
        isExpanded={expandedSections.layoverAirport}
        onToggle={() => toggleSection("layoverAirport")}
      >
        {getLayoverAirports().length === 0 ? (
          <p className="text-sm text-gray-500">No layovers in results</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {getLayoverAirports().map(({ code, name }) => (
              <label
                key={code}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedLayoverAirports.includes(code)}
                  onChange={() => toggleLayoverAirport(code)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-xs">
                  {code} - {name}
                </span>
              </label>
            ))}
          </div>
        )}
      </FilterSection>

      {/* Duration */}
      <FilterSection
        title="Duration"
        isExpanded={expandedSections.duration}
        onToggle={() => toggleSection("duration")}
        clearText="RESET"
        onClear={() => {
          setDurationValues([durationRange.min, durationRange.max]);
          setSelectedMaxDuration(durationRange.max);
        }}
      >
        {durationRange.min === durationRange.max ? (
          <div className="text-center text-sm text-gray-500 py-2">
            All flights: {formatDuration(durationRange.min)}
          </div>
        ) : (
          <RangeSlider
            min={durationRange.min}
            max={durationRange.max}
            values={durationValues}
            onChange={handleDurationChange}
            formatValue={formatDuration}
          />
        )}
      </FilterSection>

      {/* Environmental */}
      <FilterSection
        title="Environmental"
        isExpanded={expandedSections.environmental}
        onToggle={() => toggleSection("environmental")}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={lowCO2}
            onChange={() => setLowCO2(!lowCO2)}
            className="w-4 h-4 accent-green-600"
          />
          <label className="flex items-center gap-2 text-green-600 cursor-pointer text-sm">
            <FaLeaf /> Lower CO₂ emissions
          </label>
        </div>
      </FilterSection>
    </div>
  );
};

export default FlightFilterSidebar;
