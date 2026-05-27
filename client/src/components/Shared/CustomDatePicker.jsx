import React, { useState, useEffect, useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { MdOutlineCalendarMonth } from "react-icons/md";
import { C } from "./color";

/**
 * CustomDatePicker - A premium, single-month date picker with fast Month/Year navigation.
 * @param {string} value - ISO date string (YYYY-MM-DD)
 * @param {function} onChange - Callback with YYYY-MM-DD
 * @param {string} label - Optional label
 * @param {string} placeholder - Optional placeholder
 */
export default function CustomDatePicker({ value, onChange, label, placeholder = "Select Date", maxDate }) {
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
    if (viewMode === "years") {
      setViewDate(new Date(viewDate.getFullYear() + offset, viewDate.getMonth(), 1));
    } else {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    }
  };

  const handleDateClick = (dateStr) => {
    onChange(dateStr);
    setIsOpen(false);
    setViewMode("days");
  };

  const months = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
    "JUL", "AUG", "SEPT", "OCT", "NOV", "DEC"
  ];

  const maxYear = maxDate ? parseInt(maxDate.split("-")[0]) : Infinity;
  const maxMonth = maxDate ? parseInt(maxDate.split("-")[1]) - 1 : Infinity;

  const renderHeader = () => {
    const monthName = viewDate.toLocaleString("default", { month: "short" }).toUpperCase();
    const year = viewDate.getFullYear();

    let title = "";
    let isUp = false;
    if (viewMode === "days") {
      title = `${viewDate.toLocaleString("default", { month: "long" }).toUpperCase()} ${year}`;
    } else if (viewMode === "months") {
      title = `${year}`;
      isUp = true;
    } else {
      const offset = year - 2001;
      const startYear = 2001 + Math.floor(offset / 24) * 24;
      title = `${startYear} – ${startYear + 23}`;
      isUp = true;
    }

    return (
      <div className="flex items-center justify-between mb-4 px-1">
        <button 
          onClick={(e) => { 
            e.preventDefault(); 
            if (viewMode === "years") setViewMode("days");
            else setViewMode("years");
          }}
          className="flex items-center gap-2 text-sm font-medium text-slate-800 hover:text-slate-600 transition-colors"
        >
          {title}
          <span className="text-xs text-slate-500">
            {isUp ? "▲" : "▼"}
          </span>
        </button>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.preventDefault(); handleMonthChange(viewMode === "years" ? -24 : -1); }}
            className="p-1 rounded hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800"
          >
            <FiChevronLeft size={18} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleMonthChange(viewMode === "years" ? 24 : 1); }}
            className="p-1 rounded hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800"
            disabled={viewMode === "years" ? (year + 24 > maxYear && maxYear !== Infinity) : (year > maxYear || (year === maxYear && viewDate.getMonth() >= maxMonth))}
            style={{ opacity: (viewMode === "years" ? (year + 24 > maxYear && maxYear !== Infinity) : (year > maxYear || (year === maxYear && viewDate.getMonth() >= maxMonth))) ? 0.3 : 1 }}
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    // JS getDay() starts on Sunday (0). We want Monday (1) to Sunday (7)
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; // shift so Monday is 0, Sunday is 6

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const today = new Date().toISOString().split("T")[0];
    const monthName = viewDate.toLocaleString("default", { month: "long" }).toUpperCase();

    const days = [];
    
    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`pad-${i}`} className="h-10 w-full flex items-center justify-center text-[13px] text-slate-300">
          {prevMonthDays - firstDay + i + 1}
        </div>
      );
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSelected = value === dateStr;
      const isFuture = maxDate && dateStr > maxDate;
      
      days.push(
        <div
          key={dateStr}
          onClick={() => { if (!isFuture) handleDateClick(dateStr); }}
          className={`h-10 w-full flex items-center justify-center ${isFuture ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
        >
          <div className={`w-8 h-8 flex items-center justify-center rounded-full text-[13px] transition-all
            ${isSelected ? "bg-[#C6CDE9] text-slate-900 font-bold" : (isFuture ? "text-slate-400 font-medium" : "text-slate-700 hover:bg-slate-100 font-medium")}
          `}>
            {d}
          </div>
        </div>
      );
    }

    // Next month padding
    const totalCells = days.length;
    const paddingEnd = Math.ceil(totalCells / 7) * 7 - totalCells;
    for (let i = 1; i <= paddingEnd; i++) {
      days.push(
        <div key={`pad-end-${i}`} className="h-10 w-full flex items-center justify-center text-[13px] text-slate-300">
          {i}
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="grid grid-cols-7 gap-1 border-b border-slate-100 pb-2 mb-4">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={`${d}-${i}`} className="h-6 w-full flex items-center justify-center text-[12px] font-bold text-slate-400">
              {d}
            </div>
          ))}
        </div>
        <div className="text-[13px] font-bold text-slate-400 mb-2 px-2 uppercase tracking-wide">
          {monthName}
        </div>
        <div className="grid grid-cols-7 gap-y-1 gap-x-1">
          {days}
        </div>
      </div>
    );
  };

  const renderMonths = () => {
    const year = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    return (
      <div className="w-full border-t border-slate-100 pt-4 mt-2">
        <div className="text-[13px] font-bold text-slate-400 mb-4 px-2 uppercase tracking-wide">
          {year}
        </div>
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {months.map((m, idx) => {
            const isSelected = currentMonth === idx;
            const isFuture = year > maxYear || (year === maxYear && idx > maxMonth);
            return (
              <div
                key={m}
                onClick={() => {
                  if (!isFuture) {
                    setViewDate(new Date(year, idx, 1));
                    setViewMode("days");
                  }
                }}
                className={`flex items-center justify-center ${isFuture ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
              >
                <div className={`px-3 py-1.5 rounded-full text-[13px] transition-all
                  ${isSelected ? "bg-[#C6CDE9] text-slate-900 font-bold" : (isFuture ? "text-slate-400 font-medium" : "text-slate-700 hover:bg-slate-100 font-medium")}
                `}>
                  {m}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYears = () => {
    const currentYear = viewDate.getFullYear();
    const offset = currentYear - 2001;
    const startYear = 2001 + Math.floor(offset / 24) * 24;
    const years = Array.from({ length: 24 }, (_, i) => startYear + i);

    return (
      <div className="w-full border-t border-slate-100 pt-4 mt-2">
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {years.map((y) => {
            const isSelected = currentYear === y;
            const isFuture = maxYear !== Infinity && y > maxYear;
            return (
              <div
                key={y}
                onClick={() => {
                  if (!isFuture) {
                    setViewDate(new Date(y, viewDate.getMonth(), 1));
                    setViewMode("months");
                  }
                }}
                className={`flex items-center justify-center ${isFuture ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
              >
                <div className={`px-3 py-1.5 rounded-full text-[13px] transition-all
                  ${isSelected ? "bg-[#C6CDE9] text-slate-900 font-bold" : (isFuture ? "text-slate-400 font-medium" : "text-slate-700 hover:bg-slate-100 font-medium")}
                `}>
                  {y}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  let formattedValue = "";
  if (value) {
    const d = new Date(value);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    formattedValue = `${day}/${month}/${year}`;
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <button 
        type="button"
        onClick={() => {
          if (!isOpen) {
            setViewMode("days");
          }
          setIsOpen(!isOpen);
        }}
        className="w-full px-3 py-2 border rounded-lg text-[13px] flex items-center justify-between transition-all outline-none"
        style={{ borderColor: isOpen ? C.navy : C.border, background: C.white }}
      >
        <span className={!value ? "text-slate-400" : "font-medium"} style={{ color: value ? C.nearBlack : C.muted }}>
          {formattedValue || placeholder}
        </span>
        <MdOutlineCalendarMonth size={14} style={{ color: C.muted }} />
      </button>

      {isOpen && (
        <div className="absolute z-[200] mt-3 left-0 bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] p-6 w-[320px] animate-in fade-in zoom-in-95 duration-200">
          {renderHeader()}
          
          <div className="min-h-[240px]">
            {viewMode === "days" && renderDays()}
            {viewMode === "months" && renderMonths()}
            {viewMode === "years" && renderYears()}
          </div>
        </div>
      )}
    </div>
  );
}
