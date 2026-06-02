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
  focus = "start",
}) {
  const selectedStart = range ? value?.start : value;
  const selectedEnd = range ? value?.end : null;

  const [viewDate, setViewDate] = useState(new Date(selectedStart || minDate));
  const [hoverDate, setHoverDate] = useState(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const months = useMemo(() => {
    const m1 = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    return [m1];
  }, [viewDate]);

  const handleMonthChange = (offset) => {
    setViewDate(
      new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1),
    );
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
      days.push(<div key={`pad-${i}`} className="h-9 w-full" />);
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
          onMouseEnter={() =>
            !isPast && range && !selectedEnd && setHoverDate(dateStr)
          }
          onMouseLeave={() => setHoverDate(null)}
          onClick={() => !isPast && handleDateClick(dateStr)}
          className={`relative h-9 w-full flex flex-col items-center justify-center cursor-pointer transition-all group
            ${isPast ? "opacity-20 cursor-not-allowed" : ""}
            ${inRange ? "bg-blue-50" : ""}
            ${isStart ? "bg-blue-600 text-white rounded-l-xl z-10 shadow-lg" : ""}
            ${isEnd ? "bg-blue-600 text-white rounded-r-xl z-10 shadow-lg" : ""}
            ${isStart && isEnd ? "rounded-xl" : ""}
            ${!isStart && !isEnd && !isPast ? "hover:bg-gray-100 hover:rounded-lg" : ""}
          `}
        >
          <span
            className={`text-[13px] font-black tracking-tight ${isStart || isEnd ? "text-white" : "text-slate-800"}`}
          >
            {d}
          </span>
          {isToday && !isStart && !isEnd && !inRange && (
            <div className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
          )}
        </div>,
      );
    }

    return (
      <div className="flex-1 min-w-0 sm:min-w-[260px]">
        <div className="flex items-center justify-center gap-2 mb-3 text-sm font-black text-slate-900 tracking-tight uppercase">
          <button 
             type="button"
             onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
             className={`px-3 py-1 rounded-lg transition-colors ${showMonthPicker ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 hover:text-blue-600'}`}
          >
             {monthName}
          </button>
          <button 
             type="button"
             onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
             className={`px-3 py-1 rounded-lg transition-colors ${showYearPicker ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 hover:text-blue-600'}`}
          >
             {year}
          </button>
        </div>

        {showMonthPicker ? (
           <div className="grid grid-cols-3 gap-3 p-2">
             {Array.from({length: 12}).map((_, i) => {
                const mName = new Date(year, i, 1).toLocaleString("default", { month: "short" });
                const minYear = new Date(minDate).getFullYear();
                const minMonth = new Date(minDate).getMonth();
                const isPastMonth = year < minYear || (year === minYear && i < minMonth);
                
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isPastMonth}
                    onClick={() => {
                      if (!isPastMonth) {
                        setViewDate(new Date(year, i, 1));
                        setShowMonthPicker(false);
                      }
                    }}
                    className={`py-3 text-sm font-bold rounded-xl transition-all ${isPastMonth ? "opacity-30 cursor-not-allowed bg-slate-50 border border-slate-100" : (i === month ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "hover:bg-blue-50 text-slate-700 bg-slate-50 border border-slate-100")}`}
                  >
                    {mName}
                  </button>
                )
             })}
           </div>
        ) : showYearPicker ? (
           <div className="grid grid-cols-3 gap-3 p-2 max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
             {Array.from({length: 20}).map((_, i) => {
                const minYear = new Date(minDate).getFullYear();
                const y = minYear + i; 
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(y, month, 1));
                      setShowYearPicker(false);
                    }}
                    className={`py-3 text-sm font-bold rounded-xl transition-all ${y === year ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "hover:bg-blue-50 text-slate-700 bg-slate-50 border border-slate-100"}`}
                  >
                    {y}
                  </button>
                )
             })}
           </div>
        ) : (
          <div className="grid grid-cols-7 gap-y-0.5 text-center">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-[0.1em]"
              >
                {day}
              </div>
            ))}
            {days}
          </div>
        )}
      </div>
    );
  };

  const fmt = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })
      : "---";

  return (
    <div className="bg-white rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden w-full sm:w-fit sm:min-w-[320px] max-w-[400px] animate-premium-pop mx-auto">

      <div className="relative p-3 sm:p-4 flex flex-col gap-4">
        {!showMonthPicker && !showYearPicker && (
          <>
            <div
              onClick={() => handleMonthChange(-1)}
              className="absolute left-2 top-3 sm:left-4 sm:top-4 w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-blue-600 z-20 transition-all hover:shadow-md hover:scale-110 active:scale-95 cursor-pointer"
            >
              <FaChevronLeft size={10} className="sm:text-[12px]" />
            </div>
            <div
              onClick={() => handleMonthChange(1)}
              className="absolute right-2 top-3 sm:right-4 sm:top-4 w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-blue-600 z-20 transition-all hover:shadow-md hover:scale-110 active:scale-95 cursor-pointer"
            >
              <FaChevronRight size={10} className="sm:text-[12px]" />
            </div>
          </>
        )}

        {months.map((m, i) => (
          <React.Fragment key={i}>{renderMonth(m)}</React.Fragment>
        ))}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes premiumPop {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-premium-pop {
          animation: premiumPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `,
        }}
      />
    </div>
  );
}
