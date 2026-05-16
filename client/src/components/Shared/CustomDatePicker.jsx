import React, { useState, useEffect, useRef } from "react";
import { FiChevronLeft, FiChevronRight, FiCalendar, FiX, FiCheck } from "react-icons/fi";
import { C } from "./color";

/**
 * CustomDatePicker - A premium, single-month date picker with fast Month/Year navigation.
 * @param {string} value - ISO date string (YYYY-MM-DD)
 * @param {function} onChange - Callback with YYYY-MM-DD
 * @param {string} label - Optional label
 * @param {string} placeholder - Optional placeholder
 */
export default function CustomDatePicker({ value, onChange, label, placeholder = "Select Date" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState("days"); // 'days', 'months', 'years'
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setViewMode("days");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMonthChange = (offset) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const handleDateClick = (dateStr) => {
    onChange(dateStr);
    setIsOpen(false);
    setViewMode("days");
  };

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const renderHeader = () => {
    const monthName = viewDate.toLocaleString("default", { month: "long" });
    const year = viewDate.getFullYear();

    return (
      <div className="flex items-center justify-between mb-4 px-1">
        <button 
          onClick={(e) => { e.preventDefault(); handleMonthChange(viewMode === "years" ? -10 : -1); }}
          className="p-2 rounded-xl hover:bg-slate-50 transition-all text-slate-400 hover:text-[#003399]"
        >
          <FiChevronLeft size={16} />
        </button>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.preventDefault(); setViewMode(viewMode === "months" ? "days" : "months"); }}
            className={`px-2 py-1 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === "months" ? "bg-[#003399] text-white shadow-md" : "text-[#003399] hover:bg-slate-50"}`}
          >
            {monthName}
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); setViewMode(viewMode === "years" ? "days" : "years"); }}
            className={`px-2 py-1 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === "years" ? "bg-[#003399] text-white shadow-md" : "text-[#003399] hover:bg-slate-50"}`}
          >
            {year}
          </button>
        </div>

        <button 
          onClick={(e) => { e.preventDefault(); handleMonthChange(viewMode === "years" ? 10 : 1); }}
          className="p-2 rounded-xl hover:bg-slate-50 transition-all text-slate-400 hover:text-[#003399]"
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split("T")[0];

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-9 w-full" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSelected = value === dateStr;
      const isToday = dateStr === today;

      days.push(
        <div
          key={dateStr}
          onClick={() => handleDateClick(dateStr)}
          className={`h-9 w-full flex items-center justify-center rounded-xl cursor-pointer text-xs font-bold transition-all
            ${isSelected ? "text-[#003399] shadow-md scale-105" : "text-slate-600 hover:bg-slate-50 hover:text-[#003399]"}
          `}
          style={{ 
            background: isSelected ? C.gold : undefined,
            border: isToday && !isSelected ? `1.5px solid ${C.gold}44` : undefined 
          }}
        >
          {d}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="h-8 w-full flex items-center justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
            {d}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderMonths = () => {
    return (
      <div className="grid grid-cols-3 gap-2 py-2">
        {months.map((m, idx) => (
          <div
            key={m}
            onClick={() => {
              setViewDate(new Date(viewDate.getFullYear(), idx, 1));
              setViewMode("days");
            }}
            className={`py-4 flex items-center justify-center rounded-2xl cursor-pointer text-[11px] font-black uppercase tracking-widest transition-all
              ${viewDate.getMonth() === idx ? "text-[#003399]" : "text-slate-600 hover:bg-slate-50"}
            `}
            style={{ background: viewDate.getMonth() === idx ? C.gold + "44" : undefined }}
          >
            {m}
          </div>
        ))}
      </div>
    );
  };

  const renderYears = () => {
    const currentYear = viewDate.getFullYear();
    const startYear = currentYear - 10;
    const years = Array.from({ length: 21 }, (_, i) => startYear + i);

    return (
      <div className="grid grid-cols-3 gap-2 py-2 max-h-[220px] overflow-y-auto no-scrollbar">
        {years.map((y) => (
          <div
            key={y}
            onClick={() => {
              setViewDate(new Date(y, viewDate.getMonth(), 1));
              setViewMode("days");
            }}
            className={`py-4 flex items-center justify-center rounded-2xl cursor-pointer text-[11px] font-black uppercase tracking-widest transition-all
              ${currentYear === y ? "text-[#003399]" : "text-slate-600 hover:bg-slate-50"}
            `}
            style={{ background: currentYear === y ? C.gold + "44" : undefined }}
          >
            {y}
          </div>
        ))}
      </div>
    );
  };

  const formattedValue = value ? new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }) : "";

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1 mb-2">
           <FiCalendar size={10} style={{ color: C.gold }} /> {label}
        </label>
      )}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 text-sm font-bold text-slate-900 border-1.5 rounded-2xl outline-none transition-all shadow-sm cursor-pointer flex items-center justify-between"
        style={{ backgroundColor: C.gold + "11", borderColor: C.gold + "44" }}
      >
        <span className={value ? "text-slate-900" : "text-slate-400 font-medium"}>
          {formattedValue || placeholder}
        </span>
        <FiCalendar className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-[200] mt-3 left-0 bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] p-6 w-[300px] animate-in fade-in zoom-in-95 duration-200">
          {renderHeader()}
          
          <div className="min-h-[240px]">
            {viewMode === "days" && renderDays()}
            {viewMode === "months" && renderMonths()}
            {viewMode === "years" && renderYears()}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <button 
              onClick={() => { onChange(""); setIsOpen(false); setViewMode("days"); }}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: C.gold }} />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {viewMode === "days" ? "Day View" : viewMode === "months" ? "Month View" : "Year View"}
              </span>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
