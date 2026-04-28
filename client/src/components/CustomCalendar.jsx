import React, { useState, useMemo } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

/**
 * CustomCalendar - MMT Style Dual Month Calendar with Range Support
 * @param {string|object} value - Selected date(s). For range: { start, end }
 * @param {boolean} range - Whether to support range selection
 * @param {string} minDate - Minimum selectable date
 * @param {function} onChange - Callback when date(s) selected
 */
export default function CustomCalendar({ 
  value, 
  onChange, 
  range = false,
  minDate = new Date().toISOString().split("T")[0],
  onClose,
  focus = "start"
}) {
  const selectedStart = range ? value?.start : value;
  const selectedEnd = range ? value?.end : null;

  const [viewDate, setViewDate] = useState(new Date(selectedStart || minDate));
  const [hoverDate, setHoverDate] = useState(null);

  const months = useMemo(() => {
    const m1 = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const m2 = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    return [m1, m2];
  }, [viewDate]);

  const handleMonthChange = (offset) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const today = new Date().toISOString().split("T")[0];

  const handleDateClick = (dateStr) => {
    if (!range) {
      onChange(dateStr);
      return;
    }

    // Case 1: Starting fresh OR both dates already selected (reset and start new)
    if (!selectedStart || (selectedStart && selectedEnd)) {
      if (focus === "end" && selectedStart && dateStr >= selectedStart) {
        onChange({ start: selectedStart, end: dateStr });
        return;
      }
      onChange({ start: dateStr, end: null });
      return;
    }

    // Case 2: We have a start date but no end date
    if (selectedStart && !selectedEnd) {
      if (dateStr <= selectedStart) {
        // If user selects an earlier date, make that the new start date
        onChange({ start: dateStr, end: null });
      } else {
        // Complete the range
        onChange({ start: selectedStart, end: dateStr });
      }
    }
  };

  const isInRange = (dateStr) => {
    if (!range || !selectedStart) return false;
    const end = selectedEnd || hoverDate;
    if (!end) return false;
    return dateStr > selectedStart && dateStr < end;
  };

  const renderMonth = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = monthDate.toLocaleString("default", { month: "long" });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-12 w-full" />);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isPast = dateStr < minDate;
      const isStart = selectedStart === dateStr;
      const isEnd = selectedEnd === dateStr;
      const inRange = isInRange(dateStr);
      const isToday = dateStr === today;

      days.push(
        <div
          key={dateStr}
          onMouseEnter={() => !isPast && range && !selectedEnd && setHoverDate(dateStr)}
          onMouseLeave={() => setHoverDate(null)}
          onClick={() => !isPast && handleDateClick(dateStr)}
          className={`relative h-12 w-full flex flex-col items-center justify-center cursor-pointer transition-all group
            ${isPast ? "opacity-20 cursor-not-allowed" : ""}
            ${inRange ? "bg-blue-50" : ""}
            ${isStart ? "bg-blue-600 text-white rounded-l-xl z-10 shadow-lg" : ""}
            ${isEnd ? "bg-blue-600 text-white rounded-r-xl z-10 shadow-lg" : ""}
            ${isStart && isEnd ? "rounded-xl" : ""}
            ${!isStart && !isEnd && !isPast ? "hover:bg-gray-100 hover:rounded-lg" : ""}
          `}
        >
          <span className={`text-sm font-black tracking-tight ${isStart || isEnd ? "text-white" : "text-slate-800"}`}>
            {d}
          </span>
          {isToday && !isStart && !isEnd && !inRange && (
            <div className="absolute bottom-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
          )}
        </div>
      );
    }

    return (
      <div className="flex-1 min-w-[280px]">
        <div className="text-center font-black text-slate-900 mb-6 text-base tracking-tight uppercase">
          {monthName} {year}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 text-center">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
            <div key={day} className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-[0.1em]">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const fmt = (date) => date ? new Date(date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }) : "---";

  return (
    <div className="bg-white rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden w-[680px] max-w-[95vw] animate-premium-pop">
      {/* Premium Header */}
      <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Departure</span>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm min-w-[100px] text-center">
               <span className="text-sm font-black text-slate-900">{fmt(selectedStart)}</span>
            </div>
          </div>
          {range && (
            <>
              <div className="w-4 h-px bg-slate-300 mt-4" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Return</span>
                <div className={`px-3 py-1.5 rounded-xl border shadow-sm min-w-[100px] text-center transition-all ${selectedEnd ? "bg-white border-slate-200" : "bg-amber-50 border-amber-200 animate-pulse"}`}>
                  <span className={`text-sm font-black ${selectedEnd ? "text-slate-900" : "text-amber-600"}`}>
                    {selectedEnd ? fmt(selectedEnd) : "Select Date"}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {onClose && (
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-all shadow-sm"
          >
            <MdClose className="text-xl" />
          </button>
        )}
      </div>

      <div className="relative p-8 flex flex-col sm:flex-row gap-12 sm:gap-16">
        <button 
          onClick={() => handleMonthChange(-1)}
          className="absolute left-6 top-10 w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-blue-600 z-20 transition-all hover:shadow-md hover:scale-110 active:scale-95"
        >
          <FaChevronLeft size={12} />
        </button>
        <button 
          onClick={() => handleMonthChange(1)}
          className="absolute right-6 top-10 w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-blue-600 z-20 transition-all hover:shadow-md hover:scale-110 active:scale-95"
        >
          <FaChevronRight size={12} />
        </button>

        {months.map((m, i) => (
          <React.Fragment key={i}>
            {renderMonth(m)}
          </React.Fragment>
        ))}
      </div>

      <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Best corporate rates applied
        </p>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Selected</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-50" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Range</span>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes premiumPop {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-premium-pop {
          animation: premiumPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}

const MdClose = ({ className }) => (
  <svg className={className} stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0z"></path><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
);
