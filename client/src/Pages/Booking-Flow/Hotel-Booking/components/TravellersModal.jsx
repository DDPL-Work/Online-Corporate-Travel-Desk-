// components/HotelDetails/TravellersModal.jsx
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  MdClose, MdPerson, MdEmail, MdPhone, MdBadge, MdExpandMore,
  MdExpandLess, MdCheckCircle, MdErrorOutline, MdChildCare,
  MdFlight, MdHome, MdCreditCard, MdCalendarToday, MdVerified,
  MdArrowForward, MdWarning,
} from "react-icons/md";
import {
  FaPassport, FaUserTie, FaChild, FaIdCard, FaBed, FaUsers,
} from "react-icons/fa";
import { BsPersonBadge, BsShieldCheck } from "react-icons/bs";

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const TITLES = ["Mr", "Mrs", "Miss", "Ms"];

const EMPTY_PASSENGER = (paxType = 1, isLead = false) => ({
  Title: "Mr",
  FirstName: "",
  MiddleName: "",
  LastName: "",
  Phoneno: "",
  Email: "",
  PaxType: paxType,        // 1 = Adult, 2 = Child
  LeadPassenger: isLead,
  Age: "",
  PassportNo: "",
  PassportIssueDate: "",
  PassportExpDate: "",
  PAN: "",
});

/* ─────────────────────────────────────────
   Validation
───────────────────────────────────────── */
const NAME_RE = /^[A-Za-z\s]{2,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{7,15}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PASSPORT_RE = /^[A-Z0-9]{6,9}$/;

const validatePassenger = (p, isInternational) => {
  const errors = {};
  if (!p.Title) errors.Title = "Required";
  if (!NAME_RE.test(p.FirstName)) errors.FirstName = "2–50 letters only";
  if (!NAME_RE.test(p.LastName)) errors.LastName = "2–50 letters only";
  if (p.LeadPassenger) {
    if (!PHONE_RE.test(p.Phoneno)) errors.Phoneno = "Valid phone required for lead guest";
    if (!EMAIL_RE.test(p.Email)) errors.Email = "Valid email required for lead guest";
  }
  if (p.PaxType === 2) {
    if (!p.Age || parseInt(p.Age) > 12 || parseInt(p.Age) < 1) errors.Age = "Age must be 1–12 for child";
  }
  if (isInternational) {
    if (!PASSPORT_RE.test(p.PassportNo)) errors.PassportNo = "Valid passport number required";
    if (!p.PassportIssueDate) errors.PassportIssueDate = "Required for international";
    if (!p.PassportExpDate) errors.PassportExpDate = "Required for international";
  }
  if (p.PAN && !PAN_RE.test(p.PAN)) errors.PAN = "Invalid PAN format (e.g. ABCDE1234F)";
  return errors;
};

/* ─────────────────────────────────────────
   Field Component
───────────────────────────────────────── */
const Field = ({ label, required, error, children, hint }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
        <MdErrorOutline className="text-sm shrink-0" />{error}
      </span>
    )}
    {hint && !error && (
      <span className="text-[10px] text-slate-400">{hint}</span>
    )}
  </div>
);

const inputCls = (error) =>
  `w-full px-3 py-2 text-sm rounded-lg border font-medium outline-none transition-all ${
    error
      ? "border-red-300 bg-red-50 text-red-800 focus:ring-2 focus:ring-red-200"
      : "border-slate-200 bg-white text-slate-800 focus:border-[#0d7fe8] focus:ring-2 focus:ring-blue-100"
  }`;

/* ─────────────────────────────────────────
   Passenger Form Card
───────────────────────────────────────── */
const PassengerCard = ({ passenger, index, roomIndex, onChange, errors, isInternational, totalInRoom, roomAdults }) => {
  const [open, setOpen] = useState(index === 0);
  const isChild = passenger.PaxType === 2;
  const hasErrors = Object.keys(errors).length > 0;
  const isComplete = !hasErrors &&
    passenger.FirstName && passenger.LastName &&
    (!passenger.LeadPassenger || (passenger.Email && passenger.Phoneno));

  const update = (field, value) => onChange(roomIndex, index, field, value);

  const paxLabel = isChild
    ? `Child ${index - roomAdults + 1}`
    : passenger.LeadPassenger
      ? "Lead Guest"
      : `Adult ${index + 1}`;

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${
      hasErrors ? "border-red-200" : isComplete ? "border-emerald-200" : "border-slate-200"
    }`}>
      {/* Card Header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 transition ${
          hasErrors ? "bg-red-50" : isComplete ? "bg-emerald-50" : "bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isChild ? "bg-pink-100" : passenger.LeadPassenger ? "bg-[#0a2540]" : "bg-blue-100"
          }`}>
            {isChild
              ? <FaChild className="text-pink-600 text-sm" />
              : passenger.LeadPassenger
                ? <FaUserTie className="text-white text-sm" />
                : <MdPerson className="text-blue-600 text-base" />
            }
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800">
                {passenger.FirstName && passenger.LastName
                  ? `${passenger.Title} ${passenger.FirstName} ${passenger.LastName}`
                  : paxLabel}
              </span>
              {passenger.LeadPassenger && (
                <span className="text-[9px] font-black uppercase tracking-widest bg-[#0a2540] text-white px-1.5 py-0.5 rounded-full">
                  Lead
                </span>
              )}
              {isChild && (
                <span className="text-[9px] font-black uppercase tracking-widest bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full">
                  Child
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {hasErrors ? `${Object.keys(errors).length} field(s) need attention` : isComplete ? "Complete" : "Fill in details"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && !hasErrors && <MdCheckCircle className="text-emerald-500 text-lg" />}
          {hasErrors && <MdErrorOutline className="text-red-400 text-lg" />}
          {open ? <MdExpandLess className="text-slate-400 text-xl" /> : <MdExpandMore className="text-slate-400 text-xl" />}
        </div>
      </button>

      {/* Form Body */}
      {open && (
        <div className="p-4 bg-white space-y-4">
          {/* Row 1: Title + First + Last */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-2">
              <Field label="Title" required error={errors.Title}>
                <select
                  value={passenger.Title}
                  onChange={e => update("Title", e.target.value)}
                  className={inputCls(errors.Title)}
                >
                  {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-span-5">
              <Field label="First Name" required error={errors.FirstName} hint="Min 2 chars, letters only">
                <input
                  type="text"
                  value={passenger.FirstName}
                  onChange={e => update("FirstName", e.target.value)}
                  placeholder="John"
                  className={inputCls(errors.FirstName)}
                  maxLength={50}
                />
              </Field>
            </div>
            <div className="col-span-5">
              <Field label="Last Name" required error={errors.LastName} hint="Min 2 chars, letters only">
                <input
                  type="text"
                  value={passenger.LastName}
                  onChange={e => update("LastName", e.target.value)}
                  placeholder="Doe"
                  className={inputCls(errors.LastName)}
                  maxLength={50}
                />
              </Field>
            </div>
          </div>

          {/* Row 2: Middle Name */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Middle Name" hint="Optional">
              <input
                type="text"
                value={passenger.MiddleName}
                onChange={e => update("MiddleName", e.target.value)}
                placeholder="(Optional)"
                className={inputCls()}
                maxLength={50}
              />
            </Field>
            {/* Age for child */}
            {isChild && (
              <Field label="Age" required error={errors.Age} hint="Must be ≤ 12 years">
                <input
                  type="number"
                  value={passenger.Age}
                  onChange={e => update("Age", e.target.value)}
                  placeholder="e.g. 8"
                  min={1} max={12}
                  className={inputCls(errors.Age)}
                />
              </Field>
            )}
          </div>

          {/* Row 3: Phone + Email (mandatory for lead) */}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Phone Number"
              required={passenger.LeadPassenger}
              error={errors.Phoneno}
              hint={passenger.LeadPassenger ? "Required for lead guest" : "Optional"}
            >
              <div className="relative">
                <MdPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                <input
                  type="tel"
                  value={passenger.Phoneno}
                  onChange={e => update("Phoneno", e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`${inputCls(errors.Phoneno)} pl-9`}
                />
              </div>
            </Field>
            <Field
              label="Email Address"
              required={passenger.LeadPassenger}
              error={errors.Email}
              hint={passenger.LeadPassenger ? "Required for lead guest" : "Optional"}
            >
              <div className="relative">
                <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                <input
                  type="email"
                  value={passenger.Email}
                  onChange={e => update("Email", e.target.value)}
                  placeholder="john@email.com"
                  className={`${inputCls(errors.Email)} pl-9`}
                />
              </div>
            </Field>
          </div>

          {/* Passport Section */}
          <div className={`rounded-xl p-3 border-2 ${
            isInternational ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <FaPassport className={`text-sm ${isInternational ? "text-[#0d7fe8]" : "text-slate-400"}`} />
              <span className={`text-xs font-black uppercase tracking-wider ${
                isInternational ? "text-[#0d7fe8]" : "text-slate-500"
              }`}>
                Passport Details
              </span>
              {isInternational
                ? <span className="text-[9px] font-black bg-[#0d7fe8] text-white px-1.5 py-0.5 rounded-full">REQUIRED</span>
                : <span className="text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">OPTIONAL</span>
              }
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Passport No." required={isInternational} error={errors.PassportNo}>
                <input
                  type="text"
                  value={passenger.PassportNo}
                  onChange={e => update("PassportNo", e.target.value.toUpperCase())}
                  placeholder="A1234567"
                  className={inputCls(errors.PassportNo)}
                  maxLength={9}
                />
              </Field>
              <Field label="Issue Date" required={isInternational} error={errors.PassportIssueDate}>
                <input
                  type="date"
                  value={passenger.PassportIssueDate}
                  onChange={e => update("PassportIssueDate", e.target.value)}
                  className={inputCls(errors.PassportIssueDate)}
                />
              </Field>
              <Field label="Expiry Date" required={isInternational} error={errors.PassportExpDate}>
                <input
                  type="date"
                  value={passenger.PassportExpDate}
                  onChange={e => update("PassportExpDate", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={inputCls(errors.PassportExpDate)}
                />
              </Field>
            </div>
          </div>

          {/* PAN Card (domestic optional) */}
          {!isInternational && (
            <Field label="PAN Card" error={errors.PAN} hint="Optional — format: ABCDE1234F">
              <div className="relative">
                <MdCreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                <input
                  type="text"
                  value={passenger.PAN}
                  onChange={e => update("PAN", e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className={`${inputCls(errors.PAN)} pl-9`}
                  maxLength={10}
                />
              </div>
            </Field>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   Room Section
───────────────────────────────────────── */
const RoomSection = ({ roomIndex, passengers, onChange, errors, isInternational, roomConfig }) => {
  const adults = roomConfig?.adults || 1;

  return (
    <div className="space-y-3">
      {/* Room Header */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-7 h-7 rounded-lg bg-[#0a2540] flex items-center justify-center shrink-0">
          <FaBed className="text-white text-xs" />
        </div>
        <div>
          <span className="font-black text-[#0a2540] text-sm">Room {roomIndex + 1}</span>
          <span className="text-slate-400 text-[11px] ml-2">
            {roomConfig?.adults || 1} Adult{(roomConfig?.adults || 1) > 1 ? "s" : ""}
            {roomConfig?.children > 0 ? `, ${roomConfig.children} Child${roomConfig.children > 1 ? "ren" : ""}` : ""}
          </span>
        </div>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Passenger cards */}
      {passengers.map((pax, paxIdx) => (
        <PassengerCard
          key={paxIdx}
          passenger={pax}
          index={paxIdx}
          roomIndex={roomIndex}
          onChange={onChange}
          errors={errors?.[paxIdx] || {}}
          isInternational={isInternational}
          totalInRoom={passengers.length}
          roomAdults={adults}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────
   Main Modal
   Props:
     isOpen        — boolean
     onClose       — () => void
     onSubmit      — (HotelPassengerArray) => void
     rooms         — Array<{ adults: number, children: number }>
     countryCode   — string (e.g. "IN" for domestic)
     hotelCountryCode — string
───────────────────────────────────────── */
const TravellersModal = ({
  isOpen,
  onClose,
  onSubmit,
  rooms = [{ adults: 2, children: 1 }],
  countryCode = "IN",
  hotelCountryCode = "IN",
}) => {
  const isInternational = countryCode !== hotelCountryCode;

  // Build initial passengers per room
  const buildInitialPassengers = () =>
    rooms.map((room) => {
      const pax = [];
      for (let a = 0; a < (room.adults || 1); a++) {
        pax.push(EMPTY_PASSENGER(1, a === 0)); // first adult = lead
      }
      for (let c = 0; c < (room.children || 0); c++) {
        pax.push(EMPTY_PASSENGER(2, false));
      }
      return pax;
    });

  const [passengersByRoom, setPassengersByRoom] = useState(buildInitialPassengers);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
  if (isOpen) {
    setPassengersByRoom(buildInitialPassengers());
    setErrors({});
    setSubmitted(false);
  }
}, [isOpen]);

  const handleChange = useCallback((roomIdx, paxIdx, field, value) => {
    setPassengersByRoom(prev => {
      const next = prev.map(r => [...r]);
      next[roomIdx] = next[roomIdx].map((p, i) => i === paxIdx ? { ...p, [field]: value } : p);
      return next;
    });
    // Clear field error on change
    setErrors(prev => {
      const key = `${roomIdx}_${paxIdx}_${field}`;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateAll = () => {
    const allErrors = {};
    let valid = true;
    passengersByRoom.forEach((roomPax, roomIdx) => {
      roomPax.forEach((pax, paxIdx) => {
        const paxErrors = validatePassenger(pax, isInternational);
        if (Object.keys(paxErrors).length > 0) {
          allErrors[`${roomIdx}_${paxIdx}`] = paxErrors;
          valid = false;
        }
      });
    });
    setErrors(allErrors);
    return valid;
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (!validateAll()) return;

    // Build HotelPassengerArray format for API
    const HotelPassengerArray = passengersByRoom.map((roomPax) =>
      roomPax.map((p) => ({
        Title: p.Title,
        FirstName: p.FirstName,
        MiddleName: p.MiddleName || "",
        LastName: p.LastName,
        Phoneno: p.Phoneno || "",
        Email: p.Email || "",
        PaxType: p.PaxType,
        LeadPassenger: p.LeadPassenger,
        Age: p.PaxType === 2 ? parseInt(p.Age) : 0,
        PassportNo: p.PassportNo || "",
        PassportIssueDate: p.PassportIssueDate
          ? new Date(p.PassportIssueDate).toISOString()
          : "0001-01-01T00:00:00",
        PassportExpDate: p.PassportExpDate
          ? new Date(p.PassportExpDate).toISOString()
          : "0001-01-01T00:00:00",
        PAN: p.PAN || "",
      }))
    );

    onSubmit(HotelPassengerArray);
  };

  // Progress tracking
  const totalPax = passengersByRoom.flat().length;
  const completedPax = passengersByRoom.flat().filter((p, absIdx) => {
    const roomIdx = passengersByRoom.findIndex(r => r.includes(p));
    const paxIdx = passengersByRoom[roomIdx]?.indexOf(p);
    const key = `${roomIdx}_${paxIdx}`;
    const paxErrors = validatePassenger(p, isInternational);
    return Object.keys(paxErrors).length === 0 && p.FirstName && p.LastName;
  }).length;

  const errorCount = Object.keys(errors).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(10,20,40,0.7)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 680,
          maxHeight: "92vh",
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
        }}
      >
        {/* ── Modal Header ── */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100" style={{ background: "#0a2540" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <FaUsers className="text-white text-lg" />
              </div>
              <div>
                <h2 className="font-black text-white text-lg leading-none">Traveller Details</h2>
                <p className="text-white/50 text-[11px] mt-0.5">
                  {totalPax} traveller{totalPax !== 1 ? "s" : ""} · {rooms.length} room{rooms.length !== 1 ? "s" : ""}
                  {isInternational
                    ? <span className="ml-2 text-blue-300 font-bold">✈ International — Passport Required</span>
                    : <span className="ml-2 text-emerald-300 font-bold">🏠 Domestic</span>
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <MdClose className="text-white text-xl" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/60 text-[11px] font-medium">
                {completedPax} of {totalPax} complete
              </span>
              {errorCount > 0 && submitted && (
                <span className="flex items-center gap-1 text-red-300 text-[11px] font-bold">
                  <MdWarning className="text-sm" /> {errorCount} room(s) have errors
                </span>
              )}
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${totalPax > 0 ? (completedPax / totalPax) * 100 : 0}%`,
                  background: completedPax === totalPax ? "#10b981" : "#0d7fe8",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── International notice ── */}
        {isInternational && (
          <div className="shrink-0 mx-4 mt-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <MdFlight className="text-[#0d7fe8] text-xl shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-[#0a2540]">International Booking</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Passport number, issue date, and expiry date are <strong>mandatory</strong> for all guests on international bookings.
              </p>
            </div>
          </div>
        )}

        {/* ── Scrollable form ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6" style={{ scrollbarWidth: "thin" }}>
          {passengersByRoom.map((roomPax, roomIdx) => {
            // Build per-passenger errors for this room
            const roomErrors = {};
            roomPax.forEach((_, paxIdx) => {
              const key = `${roomIdx}_${paxIdx}`;
              if (errors[key]) roomErrors[paxIdx] = errors[key];
            });

            return (
              <RoomSection
                key={roomIdx}
                roomIndex={roomIdx}
                passengers={roomPax}
                onChange={handleChange}
                errors={roomErrors}
                isInternational={isInternational}
                roomConfig={rooms[roomIdx]}
              />
            );
          })}

          {/* Bottom spacing */}
          <div className="h-2" />
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BsShieldCheck className="text-emerald-500 text-lg" />
            <span className="text-[11px] text-slate-500">Your data is encrypted and secure</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm text-white transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: "linear-gradient(135deg, #0d7fe8, #0a2540)" }}
            >
              Confirm & Continue
              <MdArrowForward className="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravellersModal;