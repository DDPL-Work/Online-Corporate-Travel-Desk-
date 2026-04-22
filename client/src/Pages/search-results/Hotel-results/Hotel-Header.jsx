import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { searchHotels, fetchCities } from "../../../Redux/Actions/hotelThunks";
import { MdArrowBack, MdLocationOn, MdCalendarToday, MdPerson, MdSearch, MdBed, MdEdit } from "react-icons/md";
import { CountrySelector, SearchableSelect } from "../../../components/hotel-search/HotelSearchSubComponents";
import HotelGuestSelection from "../../../components/hotel-search/HotelGuestSelection";


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

/* ─── Divider ─── */
const Divider = () => <div className="hidden md:block w-px self-stretch bg-gray-200 my-2 shrink-0" />;

/* ─── Main Header ─── */
const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { searchPayload, countries, citiesByCountry, loading } = useSelector((state) => state.hotel);
  const { publicBranding } = useSelector((state) => state.landingPage);

  const [form, setForm] = useState({
    country: "IN",
    cityCode: "",
    cityName: "",
    checkIn: "",
    checkOut: "",
    rooms: 1,
    guestNationality: "IN",
  });

  const [roomConfigs, setRoomConfigs] = useState([
    { adults: 2, children: 0, childrenAges: [] },
  ]);

  const [isModifying, setIsModifying] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const guestRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (guestRef.current && !guestRef.current.contains(e.target)) setShowGuestDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (searchPayload) {
      setForm({
        country: searchPayload.GuestNationality || "IN",
        guestNationality: searchPayload.GuestNationality || "IN",
        cityCode: searchPayload.CityCode || "",
        cityName: "",
        checkIn: searchPayload.CheckIn || "",
        checkOut: searchPayload.CheckOut || "",
        rooms: searchPayload.NoOfRooms || 1,
      });
      if (searchPayload.PaxRooms) {
        setRoomConfigs(searchPayload.PaxRooms.map(r => ({
          adults: r.Adults,
          children: r.Children,
          childrenAges: r.ChildrenAges || []
        })));
      }
      dispatch(fetchCities(searchPayload.GuestNationality || "IN"));
    }
  }, [searchPayload, dispatch]);

  // Handle auto-locking after search completes
  useEffect(() => {
    if (!loading?.search && isModifying) {
      setIsModifying(false);
    }
  }, [loading?.search]);

  const currentCities = citiesByCountry?.[form.country] || [];

  useEffect(() => {
    if (form.cityCode && currentCities.length > 0) {
      const matched = currentCities.find((c) => c.Code === form.cityCode);
      if (matched) setForm((prev) => ({ ...prev, cityName: matched.Name }));
    }
  }, [form.cityCode, currentCities]);

  useEffect(() => {
    setRoomConfigs((prev) => {
      const next = [...prev];
      if (form.rooms > next.length) {
        for (let i = next.length; i < form.rooms; i++) {
          next.push({ adults: 2, children: 0, childrenAges: [] });
        }
      } else if (form.rooms < next.length) {
        next.length = form.rooms;
      }
      return next;
    });
  }, [form.rooms]);

  const getFlagEmoji = (countryCode) => {
    if (!countryCode) return "";
    return countryCode
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(127397 + char.charCodeAt()),
      );
  };

  const countryArray = countries?.data?.CountryList || countries?.data || countries || [];
  const normalizedCountries = Array.isArray(countryArray)
    ? countryArray.map((c) => {
        const code = c.Code || c.code;
        return {
          code,
          name: c.Name || c.name,
          flag: getFlagEmoji(code),
        };
      })
    : [];

  const handleSearch = () => {
    if (!form.cityCode || !form.checkIn || !form.checkOut) return;
    dispatch(
      searchHotels({
        payload: {
          CheckIn: form.checkIn,
          CheckOut: form.checkOut,
          CityCode: form.cityCode,
          GuestNationality: form.guestNationality,
          NoOfRooms: form.rooms,
          PaxRooms: roomConfigs.map((r) => ({
            Adults: r.adults,
            Children: r.children,
            ChildrenAges: (r.childrenAges || []).slice(0, r.children),
          })),
          IsDetailedResponse: true,
          Filters: { Refundable: true, MealType: "All" },
          ResponseTime: 23,
        },
        page: 1,
        limit: 10,
      }),
    );
  };

  const totalGuests = roomConfigs.reduce((sum, r) => sum + r.adults + r.children, 0);
  const rooms = form.rooms;

  const totalAdults = roomConfigs.reduce((sum, r) => sum + r.adults, 0);
  const totalChildren = roomConfigs.reduce((sum, r) => sum + r.children, 0);

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
          onClick={() => {
            const slug = location.state?.companySlug || publicBranding?.companySlug;
            if (slug) navigate(`/travel`);
            else window.history.back();
          }}
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
        <div className="flex flex-col md:flex-row items-stretch bg-white rounded-2xl overflow-visible shadow-2xl py-3">

          {/* Country */}
          <div className="flex-1 min-w-0 px-2 py-0.5 border-r border-gray-100">
            <CountrySelector
              label="Country"
              value={form.country}
              disabled={!isModifying}
              countries={normalizedCountries}
              onChange={(code) => {
                setForm({ ...form, country: code, cityCode: "", cityName: "" });
                dispatch(fetchCities(code));
              }}
            />
          </div>


          {/* City */}
          <div className="flex-[1.5] min-w-0 border-r border-gray-100">
            <SearchableSelect
              label="City / Area"
              icon={<MdLocationOn className="text-lg" />}
              value={form.cityCode}
              disabled={!isModifying}
              options={currentCities}
              onChange={(item) => setForm({ ...form, cityCode: item.Code, cityName: item.Name })}
              placeholder="Where are you going?"
            />
          </div>


          {/* Check In */}
          <div className="flex-1 min-w-0 border-r border-gray-100">
            <DateField
              label="Check-In"
              value={form.checkIn}
              disabled={!isModifying}
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
              disabled={!isModifying}
              min={form.checkIn || today}
              onChange={(val) => setForm({ ...form, checkOut: val })}
            />
          </div>

          <Divider />

          {/* Guests */}
          <div className="flex-[1.3] min-w-0 relative" ref={guestRef}>
            <button
              type="button"
              onMouseDown={(e) => !isModifying && e.preventDefault()}
              onClick={() => isModifying && setShowGuestDropdown((v) => !v)}
              className={`w-full flex items-center gap-2 px-4 py-3 bg-transparent border-0 text-left transition-colors rounded-xl
                ${isModifying ? "cursor-pointer hover:bg-blue-50" : "cursor-default"}`}
            >
              <MdPerson className="text-blue-600 shrink-0 text-lg" />
              <span className={`flex flex-col flex-1 min-w-0 ${!isModifying ? "opacity-60" : ""}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none">Guests & Rooms</span>
                <span className="text-sm font-bold text-gray-800 mt-1">
                  {totalGuests} Guest{totalGuests !== 1 ? "s" : ""}, {rooms} Room{rooms !== 1 ? "s" : ""}
                </span>
              </span>
              {isModifying && (
                <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${showGuestDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {showGuestDropdown && isModifying && (
              <HotelGuestSelection
                rooms={form.rooms}
                setRooms={(val) => setForm({ ...form, rooms: val })}
                guestNationality={form.guestNationality}
                setGuestNationality={(val) => setForm({ ...form, guestNationality: val })}
                roomConfigs={roomConfigs}
                setRoomConfigs={setRoomConfigs}
                normalizedCountries={normalizedCountries}
                onApply={() => setShowGuestDropdown(false)}
                CountrySelector={CountrySelector}
              />
            )}
          </div>

          {/* Toggle/Search Button */}
          <div className="px-3 flex items-center shrink-0">
            <button
              type="button"
              onClick={() => isModifying ? handleSearch() : setIsModifying(true)}
              disabled={loading?.search || (isModifying && (!form.cityCode || !form.checkIn || !form.checkOut))}
              className={`flex items-center justify-center gap-2 px-6 h-12 font-black text-xs uppercase tracking-widest transition-all rounded-xl cursor-pointer text-white shadow-md active:scale-95 group
                ${loading?.search ? "opacity-90 cursor-wait bg-gray-500" :
                  isModifying 
                  ? "bg-linear-to-br from-orange-400 via-orange-500 to-orange-600 hover:shadow-orange-200/50 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed" 
                  : "bg-linear-to-br from-[#003580] via-[#0057b8] to-[#0071c2] hover:shadow-blue-200/50 hover:brightness-110"}`}
            >
              {loading?.search ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Searching...</span>
                </>
              ) : isModifying ? (
                <>
                  <MdSearch className="text-xl group-hover:scale-110 transition-transform" />
                  <span>Search Hotels</span>
                </>
              ) : (
                <>
                  <MdEdit className="text-lg group-hover:rotate-12 transition-transform" />
                  <span>Modify Stay</span>
                </>
              )}
            </button>
          </div>
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
                {nights} Night{nights !== 1 ? "s" : ""} · {form.rooms} Room{form.rooms !== 1 ? "s" : ""} · {totalGuests} Guest{totalGuests !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
