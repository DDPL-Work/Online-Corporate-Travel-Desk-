import React, { useEffect, useRef, useState } from "react";

const MAX_TRAVELERS = 9;
const GOLD = "#C9A240";
const NAVY = "#000D26";

export default function TravelersClassModal({
  onClose,
  onApply,
  className = "",
  style = {},
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
          className="w-7 h-7 rounded-full border border-slate-300 text-slate-500 flex items-center justify-center hover:border-gold hover:text-gold transition-all bg-white shadow-sm"
          disabled={value <= 0}
        >
          -
        </button>
        <span className="w-5 text-center font-bold text-slate-800 text-sm">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          className="w-7 h-7 rounded-full border border-slate-300 text-slate-500 flex items-center justify-center hover:border-gold hover:text-gold transition-all bg-white shadow-sm disabled:opacity-20"
          disabled={disableInc}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={modalRef}
      className={`${className} bg-white rounded-t-[2.5rem] sm:rounded-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.15)] sm:shadow-2xl border-t sm:border border-slate-100 overflow-hidden flex flex-col w-full`}
      style={style}
    >
      {/* Mobile Drag Handle */}
      <div className="sm:hidden flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] sm:max-h-none">
        {/* TRAVELER SELECTION */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Traveler Selection</h4>
          </div>

          <div className="space-y-0.5">
            <Counter
              label="Adults"
              sub="12+ years"
              value={counts.adults}
              onDec={() => updateCount("adults", -1)}
              onInc={() => updateCount("adults", 1)}
              disableInc={total >= MAX_TRAVELERS}
            />
            <div className="h-px bg-slate-50 mx-1" />
            <Counter
              label="Children"
              sub="2–11 years"
              value={counts.children}
              onDec={() => updateCount("children", -1)}
              onInc={() => updateCount("children", 1)}
              disableInc={total >= MAX_TRAVELERS}
            />
            <div className="h-px bg-slate-50 mx-1" />
            <Counter
              label="Infants"
              sub="0–2 years"
              value={counts.infants}
              onDec={() => updateCount("infants", -1)}
              onInc={() => updateCount("infants", 1)}
              disableInc={total >= MAX_TRAVELERS}
            />
          </div>
          
          {error && <p className="text-[10px] text-red-600 font-bold mt-3 px-1">{error}</p>}
          <p className="text-[9px] text-slate-400 mt-4 leading-relaxed font-medium px-1 italic">
            Max {MAX_TRAVELERS} travelers allowed. Infants count must not exceed adults.
          </p>
        </div>

        <div className="h-px bg-slate-100 my-5" />

        {/* CABIN CLASS */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Cabin Class</h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "Economy", label: "Economy" },
              { id: "Premium Economy", label: "Premium Eco" },
              { id: "Business", label: "Business" },
              { id: "Premium Business", label: "Prem. Business" },
              { id: "First Class", label: "First Class" }
            ].map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => setTravelClass(cls.id)}
                className={`flex items-center justify-center h-10 rounded-xl border text-[10px] font-black transition-all uppercase tracking-wider
                  ${
                    travelClass === cls.id
                      ? "text-white border-transparent shadow-md transform scale-[1.02]"
                      : "bg-white text-slate-500 border-slate-200 hover:border-gold hover:text-gold"
                  }
                `}
                style={{
                   background: travelClass === cls.id ? NAVY : 'white',
                   borderColor: travelClass === cls.id ? NAVY : ''
                }}
              >
                {cls.label}
              </button>
            ))}
          </div>
        </div>

        {/* APPLY BUTTON */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-4 text-white rounded-2xl font-black text-[13px] shadow-xl active:scale-[0.97] transition-all uppercase tracking-[0.15em]"
            style={{ background: NAVY, boxShadow: `0 10px 25px -5px rgba(0,13,38,0.35)` }}
          >
            Apply Selection
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .hover\\:text-gold:hover { color: #C9A240 !important; }
        .hover\\:border-gold:hover { border-color: #C9A240 !important; }
      `}} />
    </div>
  );
}
