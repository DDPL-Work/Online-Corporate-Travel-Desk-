import React, { useEffect, useRef, useState } from "react";
import { FaUser, FaChild, FaBaby, FaChevronRight, FaCheckCircle, FaUsers, FaCrown } from "react-icons/fa";
import { MdFlightClass, MdClose } from "react-icons/md";

const MAX_TRAVELERS = 9;
const GOLD = "#C9A240";
const NAVY = "#000D26";

export default function TravelersClassModal({
  onClose,
  onApply,
  className = "",
  style = {},
  modalPosition = null,
  initialData = {
    passengers: { adults: 1, children: 0, infants: 0 },
    travelClass: "Economy",
  },
}) {
  const modalRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  const [counts, setCounts] = useState({
    adults: initialData.passengers?.adults ?? 1,
    children: initialData.passengers?.children ?? 0,
    infants: initialData.passengers?.infants ?? 0,
  });

  const [travelClass, setTravelClass] = useState(
    initialData.travelClass || "Economy",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    setError("");
  };

  const handleApply = () => {
    if (counts.infants > counts.adults) {
      setError("Infants cannot exceed adults");
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

  const PassengerRow = ({ label, sub, value, icon: Icon, onDec, onInc, disableInc }) => (
    <div className="flex items-center justify-between py-2.5 group">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-hover:bg-amber-50 group-hover:scale-110 shadow-sm">
          <Icon className="text-slate-400 group-hover:text-amber-600 text-base" />
        </div>
        <div>
          <p className="text-[13px] font-black text-slate-800 tracking-tight leading-none">{label}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-white rounded-xl p-0.5 border border-slate-100 shadow-sm group-hover:border-amber-200 transition-colors">
        <button
          type="button"
          onClick={onDec}
          disabled={value <= (label === "Adults" ? 1 : 0)}
          className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-20"
        >
          -
        </button>
        <span className="w-4 text-center font-black text-slate-900 text-xs">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={disableInc}
          className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-20"
        >
          +
        </button>
      </div>
    </div>
  );

  const combinedStyle = { 
    position: isMobile ? undefined : "absolute",
    right: isMobile ? undefined : 0,
    ...style, 
    ...(modalPosition || {}) 
  };

  const content = (
    <div
      ref={modalRef}
      className={`${className} bg-white rounded-t-[2rem] sm:rounded-[1.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden flex flex-col w-full sm:w-[580px] max-w-[95vw] animate-premium-pop origin-top-right transition-all duration-300`}
      style={isMobile ? {} : combinedStyle}
    >
      {/* Premium Header Container */}
      <div className="bg-[#000D26] p-5 text-white relative overflow-hidden shrink-0">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 mb-1">
              <FaUsers className="text-amber-400 text-[9px]" />
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-amber-400/80">Select Journey</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col">
                <span className="text-xl font-black leading-none">{total}</span>
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Traveller{total > 1 ? "s" : ""}</span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-xl font-black text-amber-400 leading-none truncate max-w-[120px]">{travelClass}</span>
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Cabin Class</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-0 right-0 sm:static w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <MdClose className="text-base" />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row overflow-y-auto custom-scrollbar">
        {/* Left Pane: Passengers */}
        <div className="flex-1 p-5 border-b sm:border-b-0 sm:border-r border-slate-100 bg-slate-50/40">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Passengers</h4>
          </div>
          
          <div className="space-y-0.5">
            <PassengerRow
              label="Adults"
              sub="12+ years"
              icon={FaUser}
              value={counts.adults}
              onDec={() => updateCount("adults", -1)}
              onInc={() => updateCount("adults", 1)}
              disableInc={total >= MAX_TRAVELERS}
            />
            <div className="h-px bg-slate-100 ml-12" />
            <PassengerRow
              label="Children"
              sub="2-11 years"
              icon={FaChild}
              value={counts.children}
              onDec={() => updateCount("children", -1)}
              onInc={() => updateCount("children", 1)}
              disableInc={total >= MAX_TRAVELERS}
            />
            <div className="h-px bg-slate-100 ml-12" />
            <PassengerRow
              label="Infants"
              sub="0-2 years"
              icon={FaBaby}
              value={counts.infants}
              onDec={() => updateCount("infants", -1)}
              onInc={() => updateCount("infants", 1)}
              disableInc={total >= MAX_TRAVELERS}
            />
          </div>

          {error && (
            <div className="mt-4 p-2 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 animate-shake">
              <p className="text-[10px] text-red-600 font-bold leading-tight">{error}</p>
            </div>
          )}
        </div>

        {/* Right Pane: Class */}
        <div className="flex-1 p-5 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cabin Class</h4>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {[
              { id: "Economy", label: "Economy", icon: MdFlightClass },
              { id: "Premium Economy", label: "Premium Economy", icon: MdFlightClass },
              { id: "Business", label: "Business", icon: FaCrown },
              { id: "First Class", label: "First Class", icon: FaCrown }
            ].map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => setTravelClass(cls.id)}
                className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all duration-300 text-left group relative overflow-hidden
                  ${travelClass === cls.id 
                    ? "border-amber-400 bg-amber-50/40 shadow-sm" 
                    : "border-slate-50 hover:border-amber-100 hover:bg-slate-50"}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all
                    ${travelClass === cls.id ? "bg-amber-400 text-white" : "bg-slate-50 text-slate-400"}
                  `}>
                    <cls.icon className="text-sm" />
                  </div>
                  <p className={`text-[12px] font-black transition-colors ${travelClass === cls.id ? "text-slate-900" : "text-slate-700"}`}>
                    {cls.label}
                  </p>
                </div>
                {travelClass === cls.id && (
                   <FaCheckCircle className="text-amber-500 text-xs animate-premium-pop mr-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / Apply Action */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Confirm</p>
          <p className="text-xs font-black text-slate-900 mt-1">{total} Trav · {travelClass}</p>
        </div>
        
        <button
          type="button"
          onClick={handleApply}
          className="px-8 py-3 bg-[#000D26] text-white rounded-xl font-black text-[12px] shadow-lg hover:shadow-xl transition-all uppercase tracking-[0.2em] flex items-center gap-2 group"
        >
          Apply
          <FaChevronRight className="text-amber-400 group-hover:translate-x-1 transition-transform text-[10px]" />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes premiumPop {
          0% { opacity: 0; transform: scale(0.9) translateY(5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-premium-pop {
          animation: premiumPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}} />
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        {content}
      </div>
    );
  }

  return content;
}
