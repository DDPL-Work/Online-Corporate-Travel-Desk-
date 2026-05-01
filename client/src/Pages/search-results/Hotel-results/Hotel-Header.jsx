import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
  searchHotels,
  fetchCities,
  fetchCountries,
} from "../../../Redux/Actions/hotelThunks";
import { setSearchPayload } from "../../../Redux/Slice/hotelSlice";
import {
  MdArrowBack,
  MdLocationOn,
  MdPerson,
  MdSearch,
  MdBed,
} from "react-icons/md";
import {
  CountrySelector,
  SearchableSelect,
} from "../../../components/hotel-search/HotelSearchSubComponents";
import HotelGuestSelection from "../../../components/hotel-search/HotelGuestSelection";
import CustomCalendar from "../../../components/CustomCalendar";
import { BsCalendar4 } from "react-icons/bs";

/* ─── Color Tokens ─── */
const ORANGE = "#C9A84C";
const DARK = "#000D26";
const AZURE = "#1E293B";

/* ─── Date Field ─── */
const DateField = ({
  label,
  value,
  onChange,
  min,
  open,
  setOpen,
  align = "left",
}) => {
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
  return (
    <div className="relative w-full">
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-amber-50 transition-colors rounded-xl bg-amber-50/40 border border-amber-100/60"
      >
        <BsCalendar4 className="shrink-0 text-base" style={{ color: ORANGE }} />
        <div className="flex flex-col flex-1 min-w-0">
          <span
            className="text-[10px] font-bold uppercase tracking-widest leading-none"
            style={{ color: ORANGE }}
          >
            {label}
          </span>
          {f ? (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-gray-800 leading-none">
                {f.day}
              </span>
              <span className="text-sm font-bold text-gray-600">
                {f.month} '{f.year}
              </span>
              <span className="text-xs text-gray-400">{f.weekday}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-gray-400 mt-1">
              Select date
            </span>
          )}
        </div>
      </div>
      {open && (
        <div
          className={`absolute top-[calc(100%+8px)] z-[300] ${align === "right" ? "right-0" : "left-0"}`}
        >
          <CustomCalendar
            value={value}
            minDate={min}
            onChange={(val) => {
              onChange(val);
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

const Divider = () => (
  <div className="hidden md:block w-px self-stretch bg-gray-200 my-2 shrink-0" />
);

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { searchPayload, countries, citiesByCountry, loading } = useSelector(
    (state) => state.hotel,
  );
  const { publicBranding } = useSelector((state) => state.landingPage);

  useEffect(() => {
    if (!countries || (Array.isArray(countries) && countries.length === 0)) {
      dispatch(fetchCountries());
    }
  }, [dispatch, countries]);

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
  const [openCalendar, setOpenCalendar] = useState(null);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const guestRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (guestRef.current && !guestRef.current.contains(e.target))
        setShowGuestDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync form with searchPayload ONLY on initial mount or if cityCode changes externally
  const hasSynced = useRef(false);
  useEffect(() => {
    if (searchPayload && !hasSynced.current) {
      const destCountry =
        searchPayload.CountryCode ||
        searchPayload.countryCode ||
        searchPayload.GuestNationality ||
        "IN";
      const cityName = searchPayload.CityName || searchPayload.cityName || "";
      const cityCode = searchPayload.CityCode || searchPayload.cityCode || "";

      setForm({
        country: destCountry,
        guestNationality: searchPayload.GuestNationality || "IN",
        cityCode: cityCode,
        cityName: cityName,
        checkIn: searchPayload.CheckIn || "",
        checkOut: searchPayload.CheckOut || "",
        rooms: searchPayload.NoOfRooms || 1,
      });

      if (searchPayload.PaxRooms) {
        setRoomConfigs(
          searchPayload.PaxRooms.map((r) => ({
            adults:
              r.Adults !== undefined
                ? r.Adults
                : r.adults !== undefined
                  ? r.adults
                  : 1,
            children:
              r.Children !== undefined
                ? r.Children
                : r.children !== undefined
                  ? r.children
                  : 0,
            childrenAges: r.ChildrenAges || r.childrenAges || [],
          })),
        );
      }

      if (!citiesByCountry?.[destCountry]) {
        dispatch(fetchCities(destCountry));
      }
      hasSynced.current = true;
    }
  }, [searchPayload, dispatch, citiesByCountry]);

  const currentCities = citiesByCountry?.[form.country] || [];

  useEffect(() => {
    if (form.cityCode && currentCities.length > 0) {
      const matched = currentCities.find((c) => c.cityCode === form.cityCode);
      if (matched) setForm((prev) => ({ ...prev, cityName: matched.cityName }));
    }
  }, [form.cityCode, currentCities]);

  useEffect(() => {
    setRoomConfigs((prev) => {
      const next = [...prev];
      if (form.rooms > next.length) {
        for (let i = next.length; i < form.rooms; i++)
          next.push({ adults: 2, children: 0, childrenAges: [] });
      } else if (form.rooms < next.length) next.length = form.rooms;
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

  const countryArray =
    countries?.data?.CountryList || countries?.data || countries || [];
  const normalizedCountries = Array.isArray(countryArray)
    ? countryArray.map((c) => {
        const code = c.Code || c.code;
        return { code, name: c.Name || c.name, flag: getFlagEmoji(code) };
      })
    : [];

  const handleSearch = () => {
    if (!form.cityCode || !form.checkIn || !form.checkOut) return;
    const payload = {
      CheckIn: form.checkIn,
      CheckOut: form.checkOut,
      CityCode: form.cityCode,
      CityName: form.cityName,
      CountryCode: form.country,
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
    };
    dispatch(setSearchPayload(payload));
  };

  const totalGuests = roomConfigs.reduce(
    (sum, r) => sum + r.adults + r.children,
    0,
  );
  const rooms = form.rooms;
  const nights =
    form.checkIn && form.checkOut
      ? Math.max(
          0,
          (new Date(form.checkOut) - new Date(form.checkIn)) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
  const today = new Date().toISOString().split("T")[0];

  return (
    <header className="bg-[#000D26] shadow-lg">
      <div className="container mx-auto px-4 pt-3 pb-4">
        {/* Top Actions Row */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => {
              navigate(`/travel`, { state: { activeTab: "hotel" } });
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white transition"
          >
            <MdArrowBack /> Back to Search
          </button>
          <button
            type="button"
            onClick={() => {
              navigate(`/travel`, { state: { activeTab: "flight" } });
            }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm"
            style={{ background: ORANGE, color: DARK }}
          >
            <MdSearch /> Search Flight
          </button>
        </div>

        {/* Title row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <MdBed className="text-2xl" style={{ color: ORANGE }} />
          <span className="text-white font-black text-lg">Hotels</span>
          {form.cityName && (
            <>
              <span className="text-white/50 text-sm">in</span>
              <span className="text-white font-bold">{form.cityName}</span>
            </>
          )}
          {nights > 0 && (
            <span
              className="text-xs font-black px-2.5 py-0.5 rounded-full"
              style={{ background: ORANGE, color: DARK }}
            >
              {nights} Night{nights !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch bg-white rounded-2xl overflow-visible shadow-2xl py-3">
          <div className="flex-1 min-w-0 px-2 py-0.5 border-b md:border-b-0 md:border-r border-gray-100 bg-amber-50/30">
            <CountrySelector
              label="Country"
              variant="minimal"
              value={form.country}
              countries={normalizedCountries}
              onChange={(code) => {
                setForm({ ...form, country: code, cityCode: "", cityName: "" });
                if (!citiesByCountry?.[code]) {
                  dispatch(fetchCities(code));
                }
              }}
            />
          </div>
          <div className="flex-[1.5] min-w-0 px-2 py-0.5 border-b md:border-b-0 md:border-r border-gray-100 bg-amber-50/30">
            <SearchableSelect
              label="City / Area"
              variant="minimal"
              icon={
                <MdLocationOn className="text-lg" style={{ color: ORANGE }} />
              }
              value={form.cityCode}
              options={currentCities}
              displayKey="cityName"
              valueKey="cityCode"
              onChange={(item) =>
                setForm({
                  ...form,
                  cityCode: item.cityCode,
                  cityName: item.cityName,
                })
              }
              placeholder="Where are you going?"
            />
          </div>
          <div className="flex-1 min-w-0 px-2 py-0.5 border-b md:border-b-0 md:border-r border-gray-100">
            <DateField
              label="Check-In"
              value={form.checkIn}
              min={today}
              open={openCalendar === "checkIn"}
              setOpen={(val) => setOpenCalendar(val ? "checkIn" : null)}
              onChange={(val) =>
                setForm({
                  ...form,
                  checkIn: val,
                  checkOut:
                    form.checkOut && form.checkOut <= val ? "" : form.checkOut,
                })
              }
            />
          </div>
          {nights > 0 && (
            <div className="hidden md:flex items-center justify-center px-1 shrink-0">
              <span
                className="text-xs font-black px-2 py-1 rounded-full whitespace-nowrap border"
                style={{
                  background: `${ORANGE}1A`,
                  color: ORANGE,
                  borderColor: `${ORANGE}50`,
                }}
              >
                {nights}N
              </span>
            </div>
          )}
          <Divider />
          <div className="flex-1 min-w-0 px-2 py-0.5 border-b md:border-b-0 md:border-r border-gray-100">
            <DateField
              label="Check-Out"
              value={form.checkOut}
              min={form.checkIn || today}
              open={openCalendar === "checkOut"}
              setOpen={(val) => setOpenCalendar(val ? "checkOut" : null)}
              align="right"
              onChange={(val) => setForm({ ...form, checkOut: val })}
            />
          </div>
          <Divider />
          <div
            className="flex-[1.3] min-w-0 relative px-2 py-0.5 border-b md:border-b-0 border-gray-100"
            ref={guestRef}
          >
            <button
              type="button"
              onClick={() => setShowGuestDropdown((v) => !v)}
              className="w-full h-full flex items-center gap-2 px-4 py-3 bg-amber-50/40 border border-amber-100/60 text-left transition-colors rounded-xl cursor-pointer hover:bg-amber-50"
            >
              <MdPerson
                className="shrink-0 text-lg"
                style={{ color: ORANGE }}
              />
              <span className="flex flex-col flex-1 min-w-0">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest leading-none"
                  style={{ color: ORANGE }}
                >
                  Guests &amp; Rooms
                </span>
                <span className="text-sm font-bold text-gray-800 mt-1">
                  {totalGuests} Guest{totalGuests !== 1 ? "s" : ""}, {rooms}{" "}
                  Room{rooms !== 1 ? "s" : ""}
                </span>
              </span>
              <svg
                className={`w-3 h-3 shrink-0 transition-transform ${showGuestDropdown ? "rotate-180" : ""}`}
                style={{ color: ORANGE }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showGuestDropdown && (
              <div className="absolute top-full right-0 z-[1000] mt-2 shadow-2xl">
                <HotelGuestSelection
                  rooms={form.rooms}
                  setRooms={(val) => setForm({ ...form, rooms: val })}
                  guestNationality={form.guestNationality}
                  setGuestNationality={(val) =>
                    setForm({ ...form, guestNationality: val })
                  }
                  roomConfigs={roomConfigs}
                  setRoomConfigs={setRoomConfigs}
                  normalizedCountries={normalizedCountries}
                  onApply={() => setShowGuestDropdown(false)}
                  CountrySelector={CountrySelector}
                />
              </div>
            )}
          </div>
          <div className="px-3 flex items-center shrink-0">
            <button
              type="button"
              onClick={handleSearch}
              disabled={
                loading?.search ||
                !form.cityCode ||
                !form.checkIn ||
                !form.checkOut
              }
              className="flex items-center justify-center gap-2 px-8 h-12 font-black text-xs uppercase tracking-widest transition-all rounded-xl cursor-pointer shadow-md active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading?.search ? AZURE : ORANGE,
                color: loading?.search ? "#fff" : DARK,
              }}
            >
              {loading?.search ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <MdSearch className="text-xl group-hover:scale-110 transition-transform" />
                  <span>Search Hotels</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info strip */}
        {(form.cityName || nights > 0) && (
          <div className="flex items-center gap-4 mt-2 px-1 flex-wrap">
            {form.cityName && (
              <span className="text-white/50 text-xs font-medium flex items-center gap-1">
                <MdLocationOn className="text-xs" /> {form.cityName}
              </span>
            )}
            {nights > 0 && (
              <span className="text-white/50 text-xs font-medium">
                {nights} Night{nights !== 1 ? "s" : ""} · {form.rooms} Room
                {form.rooms !== 1 ? "s" : ""} · {totalGuests} Guest
                {totalGuests !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
