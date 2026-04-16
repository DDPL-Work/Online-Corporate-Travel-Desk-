import React, { useEffect, useRef, useState } from "react";

const MAX_TRAVELERS = 9;

export default function TravelersClassModal({
  onClose,
  onApply,
  modalPosition,
  initialData = {
    passengers: { adults: 1, children: 0, infants: 0 },
    travelClass: "Economy",
  },
}) {
  const modalRef = useRef(null);

  const [counts, setCounts] = useState({
    adults: initialData.passengers?.adults ?? 1,
    children: initialData.passengers?.children ?? 0,
    infants: initialData.passengers?.infants ?? 0,
  });

  const [travelClass, setTravelClass] = useState(
    initialData.travelClass || "Economy",
  );
  const [error, setError] = useState("");

  /* Close on outside click / esc */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEsc = (e) => e.key === "Escape" && onClose();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const total = counts.adults + counts.children + counts.infants;

  const updateCount = (key, delta) => {
    setCounts((prev) => {
      const next = { ...prev, [key]: Math.max(0, prev[key] + delta) };
      if (next.adults < 1) next.adults = 1;
      if (next.infants > next.adults) next.infants = next.adults;
      if (next.adults + next.children + next.infants > MAX_TRAVELERS) {
        return prev;
      }
      return next;
    });
  };

  const handleApply = () => {
    if (counts.infants > counts.adults) {
      setError("Infants cannot exceed adults");
      return;
    }
    if (total < 1) {
      setError("Select at least one traveler");
      return;
    }
    onApply({
      adults: counts.adults,
      children: counts.children,
      infants: counts.infants,
      travelClass,
    });
    onClose();
  };

  const Counter = ({ label, sub, value, onDec, onInc, disableInc }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDec}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:border-blue-500"
          disabled={value <= 0}
        >
          -
        </button>
        <span className="w-6 text-center font-semibold text-gray-800">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:border-blue-500 disabled:opacity-50"
          disabled={disableInc}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="absolute z-50"
      style={{
        top: modalPosition.top,
        left: modalPosition.left,
        width: modalPosition.width,
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl border border-gray-200"
      >
        <div className="p-6">
          {/* TRAVELER COUNTS */}
          <div className="mb-4 space-y-2">
            <p className="font-medium text-gray-800 text-sm">TRAVELERS</p>
            <Counter
              label="Adults"
              sub="12+ years"
              value={counts.adults}
              onDec={() => updateCount("adults", -1)}
              onInc={() => updateCount("adults", 1)}
              disableInc={total >= MAX_TRAVELERS}
            />
            <Counter
              label="Children"
              sub="2–11 years"
              value={counts.children}
              onDec={() => updateCount("children", -1)}
              onInc={() => updateCount("children", 1)}
              disableInc={total >= MAX_TRAVELERS}
            />
            <Counter
              label="Infants"
              sub="0–2 years · one infant per adult"
              value={counts.infants}
              onDec={() => updateCount("infants", -1)}
              onInc={() => updateCount("infants", 1)}
              disableInc={total >= MAX_TRAVELERS}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <p className="text-xs text-gray-500">
              Max {MAX_TRAVELERS} travelers. Infants cannot exceed adult count.
            </p>
          </div>

          {/* CABIN CLASS */}
          <div className="mb-4">
            <p className="font-medium text-gray-800 mb-1.5 text-sm">
              CHOOSE TRAVEL CLASS
            </p>
            <div className="flex gap-2 flex-wrap">
              {["Economy", "Premium Economy", "Business", "First Class", "Premium Business"].map(
                (cls) => (
                  <button
                    key={cls}
                    onClick={() => setTravelClass(cls)}
                    className={`px-3 py-1 rounded-lg border text-xs
                    ${
                      travelClass === cls
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 hover:bg-blue-50"
                    }
                  `}
                  >
                    {cls}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* APPLY */}
          <div className="flex justify-end">
            <button
              onClick={handleApply}
              className="px-5 py-1 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
            >
              APPLY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
