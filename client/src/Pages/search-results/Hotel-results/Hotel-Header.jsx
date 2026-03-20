import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { searchHotels, fetchCities } from "../../../Redux/Actions/hotelThunks";
import { MdArrowBack, MdLocationOn, MdCalendarToday, MdPerson, MdSearch, MdBed } from "react-icons/md";

/* ─── Searchable Dropdown ─── */
const SearchableDropdown = ({ label, icon, value, options = [], onChange, placeholder = "Select", displayKey = "Name", valueKey = "Code" }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const filtered = options.filter((item) => item[displayKey]?.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find((opt) => opt[valueKey] === value);

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-transparent border-0 cursor-pointer text-left hover:bg-blue-50 transition-colors rounded-xl"
      >
        <span className="text-blue-600 shrink-0 text-lg">{icon}</span>
        <span className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none">{label}</span>
          <span className={`text-sm font-bold mt-1 truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
            {selected?.[displayKey] || placeholder}
          </span>
        </span>
        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item[valueKey]}
                  onClick={() => { onChange(item); setOpen(false); setSearch(""); }}
                  className="px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 hover:bg-blue-50 transition-colors"
                >
                  <MdLocationOn className="text-blue-300 shrink-0" />
                  <span className="font-medium text-gray-700">{item[displayKey]}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-4 text-sm text-gray-400 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Date Field ─── */
const DateField = ({ label, value, onChange, min }) => {
  const inputRef = useRef(null);

  const fmt = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + "T00:00:00");
    return {
      day: d.getDate(),
      month: d.toLocaleString("default", { month: "short" }),
      year: String(d.getFullYear()).slice(2),
      weekday: d.toLocaleString("default", { weekday: "short" }),
    };
  };

  const f = fmt(value);

  const openPicker = () => {
    try { inputRef.current?.showPicker(); } catch { inputRef.current?.click(); }
  };

  return (
    <div className="relative w-full">
      {/* Visible display — clicking triggers picker */}
      <div
        onClick={openPicker}
        className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors rounded-xl"
      >
        <MdCalendarToday className="text-blue-600 shrink-0 text-base" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none">{label}</span>
          {f ? (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-gray-800 leading-none">{f.day}</span>
              <span className="text-sm font-bold text-gray-600">{f.month} '{f.year}</span>
              <span className="text-xs text-gray-400">{f.weekday}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-gray-400 mt-1">Select date</span>
          )}
        </div>
      </div>

      {/* Native input: invisible, sits on top, pointer-events controlled via JS */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
};

/* ─── Guest Selector ─── */
const GuestSelector = ({ rooms, adults, children, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const Counter = ({ label, sub, value, onDec, onInc, min = 0 }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0 border-gray-100">
      <div>
        <div className="text-sm font-semibold text-gray-800">{label}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDec}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border-2 border-blue-500 text-blue-500 font-bold flex items-center justify-center disabled:border-gray-200 disabled:text-gray-300 hover:bg-blue-50 transition text-lg leading-none"
        >−</button>
        <span className="w-5 text-center font-bold text-gray-800 text-base">{value}</span>
        <button
          type="button"
          onClick={onInc}
          className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-700 transition text-lg leading-none"
        >+</button>
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-transparent border-0 cursor-pointer text-left hover:bg-blue-50 transition-colors rounded-xl"
      >
        <MdPerson className="text-blue-600 shrink-0 text-lg" />
        <span className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none">Guests & Rooms</span>
          <span className="text-sm font-bold text-gray-800 mt-1">
            {adults + children} Guest{adults + children !== 1 ? "s" : ""}, {rooms} Room{rooms !== 1 ? "s" : ""}
          </span>
        </span>
        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 w-72">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Configure Stay</div>
          <Counter label="Rooms" value={rooms} min={1} onDec={() => onChange({ rooms: Math.max(1, rooms - 1) })} onInc={() => onChange({ rooms: rooms + 1 })} />
          <Counter label="Adults" sub="Age 12+" value={adults} min={1} onDec={() => onChange({ adults: Math.max(1, adults - 1) })} onInc={() => onChange({ adults: adults + 1 })} />
          <Counter label="Children" sub="Below 12 years" value={children} min={0} onDec={() => onChange({ children: Math.max(0, children - 1) })} onInc={() => onChange({ children: children + 1 })} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Divider ─── */
const Divider = () => <div className="hidden md:block w-px self-stretch bg-gray-200 my-2 shrink-0" />;

/* ─── Main Header ─── */
const Header = () => {
  const dispatch = useDispatch();
  const { searchPayload, countries, citiesByCountry } = useSelector((state) => state.hotel);

  const [form, setForm] = useState({
    country: "IN",
    cityCode: "",
    cityName: "",
    checkIn: "",
    checkOut: "",
    rooms: 1,
    adults: 2,
    children: 0,
  });

  useEffect(() => {
    if (searchPayload) {
      setForm({
        country: searchPayload.GuestNationality || "IN",
        cityCode: searchPayload.CityCode || "",
        cityName: "",
        checkIn: searchPayload.CheckIn || "",
        checkOut: searchPayload.CheckOut || "",
        rooms: searchPayload.NoOfRooms || 1,
        adults: searchPayload.PaxRooms?.[0]?.Adults || 2,
        children: searchPayload.PaxRooms?.[0]?.Children || 0,
      });
      dispatch(fetchCities(searchPayload.GuestNationality || "IN"));
    }
  }, [searchPayload, dispatch]);

  const currentCities = citiesByCountry?.[form.country] || [];

  useEffect(() => {
    if (form.cityCode && currentCities.length > 0) {
      const matched = currentCities.find((c) => c.Code === form.cityCode);
      if (matched) setForm((prev) => ({ ...prev, cityName: matched.Name }));
    }
  }, [form.cityCode, currentCities]);

  const handleSearch = () => {
    if (!form.cityCode || !form.checkIn || !form.checkOut) return;
    dispatch(searchHotels({
      CheckIn: form.checkIn,
      CheckOut: form.checkOut,
      CityCode: form.cityCode,
      GuestNationality: form.country,
      NoOfRooms: form.rooms,
      PaxRooms: [{
        Adults: form.adults,
        Children: form.children,
        ChildrenAges: form.children > 0 ? Array(form.children).fill(5) : [],
      }],
      IsDetailedResponse: true,
      Filters: { Refundable: false, MealType: "All" },
    }));
  };

  const nights = form.checkIn && form.checkOut
    ? Math.max(0, (new Date(form.checkOut) - new Date(form.checkIn)) / (1000 * 60 * 60 * 24))
    : 0;

  const today = new Date().toISOString().split("T")[0];

  return (
    <header className="bg-linear-to-r from-[#003580] via-[#0057b8] to-[#0071c2] shadow-lg">
      <div className="container mx-auto px-4 pt-3 pb-4">

        {/* Back */}
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-sm font-semibold text-blue-200 hover:text-white transition mb-3"
        >
          <MdArrowBack />
          Back to Search
        </button>

        {/* Title row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <MdBed className="text-yellow-400 text-2xl" />
          <span className="text-white font-black text-lg">Hotels</span>
          {form.cityName && (
            <>
              <span className="text-blue-300 text-sm">in</span>
              <span className="text-white font-bold">{form.cityName}</span>
            </>
          )}
          {nights > 0 && (
            <span className="bg-yellow-400 text-blue-900 text-xs font-black px-2.5 py-0.5 rounded-full">
              {nights} Night{nights !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch bg-white rounded-2xl overflow-visible shadow-2xl">

          {/* Country */}
          <div className="flex-1 min-w-0">
            <SearchableDropdown
              label="Country"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" /></svg>}
              value={form.country}
              options={countries || []}
              onChange={(item) => {
                setForm({ ...form, country: item.Code, cityCode: "", cityName: "" });
                dispatch(fetchCities(item.Code));
              }}
              placeholder="Select Country"
            />
          </div>

          <Divider />

          {/* City */}
          <div className="flex-[1.5] min-w-0">
            <SearchableDropdown
              label="City / Area"
              icon={<MdLocationOn className="text-lg" />}
              value={form.cityCode}
              options={currentCities}
              onChange={(item) => setForm({ ...form, cityCode: item.Code, cityName: item.Name })}
              placeholder="Where are you going?"
            />
          </div>

          <Divider />

          {/* Check In */}
          <div className="flex-1 min-w-0">
            <DateField
              label="Check-In"
              value={form.checkIn}
              min={today}
              onChange={(val) => setForm({ ...form, checkIn: val, checkOut: form.checkOut && form.checkOut <= val ? "" : form.checkOut })}
            />
          </div>

          {/* Nights badge */}
          {nights > 0 && (
            <div className="hidden md:flex items-center justify-center px-1 shrink-0">
              <span className="bg-blue-50 border border-blue-200 text-blue-600 text-xs font-black px-2 py-1 rounded-full whitespace-nowrap">
                {nights}N
              </span>
            </div>
          )}

          <Divider />

          {/* Check Out */}
          <div className="flex-1 min-w-0">
            <DateField
              label="Check-Out"
              value={form.checkOut}
              min={form.checkIn || today}
              onChange={(val) => setForm({ ...form, checkOut: val })}
            />
          </div>

          <Divider />

          {/* Guests */}
          <div className="flex-[1.3] min-w-0">
            <GuestSelector
              rooms={form.rooms}
              adults={form.adults}
              children={form.children}
              onChange={(updates) => setForm({ ...form, ...updates })}
            />
          </div>

          {/* Search Button */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={!form.cityCode || !form.checkIn || !form.checkOut}
            className="shrink-0 flex items-center justify-center gap-2 px-8 bg-linear-to-b from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wide transition-all rounded-b-2xl md:rounded-b-none md:rounded-r-2xl min-h-[60px] cursor-pointer"
          >
            <MdSearch className="text-xl" />
            <span>Search</span>
          </button>
        </div>

        {/* Info strip */}
        {(form.cityName || nights > 0) && (
          <div className="flex items-center gap-4 mt-2 px-1 flex-wrap">
            {form.cityName && (
              <span className="text-blue-200 text-xs font-medium flex items-center gap-1">
                <MdLocationOn className="text-xs" /> {form.cityName}
              </span>
            )}
            {nights > 0 && (
              <span className="text-blue-200 text-xs font-medium">
                {nights} Night{nights !== 1 ? "s" : ""} · {form.rooms} Room{form.rooms !== 1 ? "s" : ""} · {form.adults + form.children} Guest{form.adults + form.children !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;