import React from "react";
import { MdVerifiedUser } from "react-icons/md";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiShield,
  FiMapPin,
  FiGlobe,
  FiBookOpen,
  FiInfo,
} from "react-icons/fi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import CustomDatePicker from "../../../../components/Shared/CustomDatePicker";
import { InfoCell, SectionHeading, Required, Divider } from "./ReviewPageComps";

export const GuestDetailsForm = ({
  isBookNowMode, approvedBy, travelers, updateTraveler, countries,
  totalAdultsFromSearch, totalChildrenFromSearch, formErrors, requiredFlags,
  isCorporateBooking, setIsCorporateBooking, applyLeadPan, setApplyLeadPan,
  setTravelers, isInternationalBooking, validation, purposeOfTravel, setPurposeOfTravel
}) => {
  return (
          <div className="lg:col-span-2 space-y-6">
            {/* BookNow mode: read-only approved guests */}
            {isBookNowMode ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 overflow-hidden">
                <div className="bg-linear-to-r from-green-600 to-emerald-500 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <MdVerifiedUser size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Guest Details — Verified
                      </h3>
                      <p className="text-[11px] text-green-100">
                        Approved{" "}
                        {approvedBy
                          ? `by ${approvedBy?.name || "Manager"}`
                          : ""}{" "}
                        · Ready to book
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-3 py-1 rounded-full border border-slate-300">
                    {travelers.length} Guest{travelers.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  {travelers.map((t, index) => (
                    <div
                      key={t.id || t._id || index}
                      className="rounded-xl border border-slate-100 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[10px] font-bold text-[#C9A84C]">
                            {(t.firstName?.[0] || "G").toUpperCase()}
                            {(t.lastName?.[0] || "").toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {t.title} {t.firstName} {t.middleName || ""}{" "}
                            {t.lastName}
                          </span>
                          {t.leadPassenger && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Guest {index + 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
                        <InfoCell icon={FiMail} label="Email" value={t.email} />
                        <InfoCell
                          icon={FiPhone}
                          label="Phone"
                          value={t.phoneWithCode ? `+${t.phoneWithCode}` : "—"}
                        />
                        <InfoCell
                          icon={FiGlobe}
                          label="Nationality"
                          value={
                            countries.find((c) => c.isoCode === t.nationality)
                              ?.name ||
                            t.nationality ||
                            "—"
                          }
                        />
                        <InfoCell
                          icon={FiCalendar}
                          label="Date of Birth"
                          value={
                            t.dob
                              ? new Date(t.dob).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"
                          }
                        />
                        <InfoCell
                          icon={FiUser}
                          label="Age"
                          value={t.age ? `${t.age} yrs` : "—"}
                        />
                        <InfoCell
                          icon={FiMapPin}
                          label="Country"
                          value={t.countryCode || "—"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Non-BookNow mode: editable guest form */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C]">
                      <FiUser size={15} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Guest Details
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Search Criteria:
                        </p>
                        <span className="text-[10px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded-full border border-[#C9A84C]/20">
                          {totalAdultsFromSearch} Adult
                          {totalAdultsFromSearch !== 1 ? "s" : ""}
                        </span>
                        {totalChildrenFromSearch > 0 && (
                          <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                            {totalChildrenFromSearch} Child
                            {totalChildrenFromSearch !== 1 ? "ren" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {travelers.map((t, index) => (
                    <div
                      key={t.id || t._id || index}
                      className="rounded-2xl border border-slate-200 shadow-md shadow-black/20 relative"
                      style={{ zIndex: travelers.length - index + 10 }}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-linear-to-r from-[#C9A84C]/5 to-[#C9A84C]/10 border-b border-slate-200 rounded-t-2xl">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            <FiUser size={13} className="text-[#C9A84C]" />
                            {t.paxType === 2 ? "Child" : "Adult"} {index + 1}
                          </span>
                          {t.leadPassenger && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] bg-[#C9A84C]/10 px-2.5 py-0.5 rounded-full border border-[#C9A84C]/20">
                              Primary Guest
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-6 bg-white rounded-b-2xl">
                        {/* Full Name */}
                        <div>
                          <SectionHeading
                            icon={<FiUser size={12} />}
                            title={`${t.paxType === 2 ? "Child" : "Adult"} Details`}
                          />
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="field-label">Title</label>
                              <select
                                value={t.title}
                                disabled={isBookNowMode}
                                onChange={(e) =>
                                  updateTraveler(t.id, "title", e.target.value)
                                }
                                className="field-input"
                              >
                                <option>Mr.</option>
                                <option>Mrs.</option>
                                <option>Miss.</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                First Name <Required />
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Rahul"
                                value={t.firstName}
                                disabled={isBookNowMode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(
                                    /[^A-Za-z]/g,
                                    "",
                                  );
                                  updateTraveler(t.id, "firstName", val);
                                }}
                                className={`field-input ${formErrors[t.id]?.firstName ? "border-red-500 ring-1 ring-red-500" : ""}`}
                              />
                              {formErrors[t.id]?.firstName && (
                                <p className="text-[10px] text-red-500 mt-1">
                                  {formErrors[t.id].firstName}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Middle Name{" "}
                                <span className="text-slate-500 font-normal normal-case">
                                  (optional)
                                </span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Kumar"
                                value={t.middleName || ""}
                                disabled={isBookNowMode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(
                                    /[^A-Za-z]/g,
                                    "",
                                  );
                                  updateTraveler(t.id, "middleName", val);
                                }}
                                className="field-input"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Last Name <Required />
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Singh"
                                value={t.lastName}
                                disabled={isBookNowMode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(
                                    /[^A-Za-z]/g,
                                    "",
                                  );
                                  updateTraveler(t.id, "lastName", val);
                                }}
                                className={`field-input ${formErrors[t.id]?.lastName ? "border-red-500 ring-1 ring-red-500" : ""}`}
                              />
                              {formErrors[t.id]?.lastName && (
                                <p className="text-[10px] text-red-500 mt-1">
                                  {formErrors[t.id].lastName}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <Divider />

                        {/* Contact Details (adults only) */}
                        {t.paxType !== 2 && (
                          <div>
                            <SectionHeading
                              icon={<FiMail size={12} />}
                              title="Contact Details"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="field-label">
                                  Email Address <Required />
                                </label>
                                <div className="relative">
                                  <FiMail
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                    size={14}
                                  />
                                  <input
                                    type="email"
                                    placeholder="e.g. rahul@email.com"
                                    value={t.email}
                                    disabled={isBookNowMode}
                                    onChange={(e) =>
                                      updateTraveler(
                                        t.id,
                                        "email",
                                        e.target.value,
                                      )
                                    }
                                    className={`field-input pl-9 ${formErrors[t.id]?.email ? "border-red-500 ring-1 ring-red-500" : ""}`}
                                  />
                                  {formErrors[t.id]?.email && (
                                    <p className="text-[10px] text-red-500 mt-1">
                                      {formErrors[t.id].email}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="field-label">
                                  Phone Number {t.leadPassenger && <Required />}
                                </label>
                                <PhoneInput
                                  country={"in"}
                                  value={t.phoneWithCode}
                                  disabled={isBookNowMode}
                                  onChange={(value, data) => {
                                    updateTraveler(
                                      t.id,
                                      "phoneWithCode",
                                      value,
                                    );
                                    updateTraveler(
                                      t.id,
                                      "countryCode",
                                      data?.countryCode?.toUpperCase(),
                                    );
                                  }}
                                  inputClass={`!h-10 !w-full !text-sm !bg-white !border !rounded-lg !text-slate-800 focus:!border-[#C9A84C] focus:!ring-2 focus:!ring-[#C9A84C]/10 ${formErrors[t.id]?.phoneWithCode ? "!border-red-500 !ring-1 !ring-red-500" : "!border-slate-200"}`}
                                  buttonClass="!border !border-slate-200 !rounded-l-lg !bg-white"
                                  containerClass="w-full"
                                  enableSearch
                                />
                                {formErrors[t.id]?.phoneWithCode && (
                                  <p className="text-[10px] text-red-500 mt-1">
                                    {formErrors[t.id].phoneWithCode}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <Divider />

                        {/* Personal Details */}
                        <div>
                          <SectionHeading
                            icon={<FiInfo size={12} />}
                            title="Personal Details"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Nationality <Required />
                              </label>
                              <select
                                value={t.nationality}
                                disabled
                                onChange={(e) =>
                                  updateTraveler(
                                    t.id,
                                    "nationality",
                                    e.target.value,
                                  )
                                }
                                className="field-input cursor-not-allowed bg-slate-50"
                              >
                                <option value="">Select country</option>
                                {countries.map((c) => (
                                  <option key={c.isoCode} value={c.isoCode}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Date of Birth
                                {t.paxType === 2 && (
                                  <span className="text-red-500 ml-0.5">*</span>
                                )}
                              </label>
                              {isBookNowMode ? (
                                <input
                                  type="date"
                                  value={t.dob || ""}
                                  disabled={true}
                                  className="field-input"
                                />
                              ) : (
                                <div
                                  className={
                                    formErrors[t.id]?.dob
                                      ? "rounded-lg border border-red-500 ring-1 ring-red-500"
                                      : ""
                                  }
                                >
                                  <CustomDatePicker
                                    value={t.dob || ""}
                                    maxDate={
                                      new Date().toISOString().split("T")[0]
                                    }
                                    minDate={(() => {
                                      if (t.paxType === 2 && t.originalAge) {
                                        const minYear =
                                          new Date().getFullYear() -
                                          Number(t.originalAge) -
                                          1;
                                        return `${minYear}-01-01`;
                                      }
                                      return undefined;
                                    })()}
                                    onChange={(val) => {
                                      if (!val) {
                                        updateTraveler(t.id, "dob", "");
                                        updateTraveler(t.id, "age", "");
                                        return;
                                      }
                                      const dob = val;
                                      const today = new Date();
                                      const birth = new Date(dob);
                                      let age =
                                        today.getFullYear() -
                                        birth.getFullYear();
                                      const m =
                                        today.getMonth() - birth.getMonth();
                                      if (
                                        m < 0 ||
                                        (m === 0 &&
                                          today.getDate() < birth.getDate())
                                      )
                                        age--;
                                      updateTraveler(t.id, "dob", dob);
                                      updateTraveler(t.id, "age", age);
                                    }}
                                  />
                                </div>
                              )}
                              {formErrors[t.id]?.dob && (
                                <p className="text-[10px] text-red-500 mt-1">
                                  {formErrors[t.id].dob}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Age{" "}
                                <span className="text-slate-500 font-normal normal-case">
                                  (auto-calculated)
                                </span>
                              </label>

                              <input
                                type="number"
                                value={t.age || ""}
                                readOnly
                                placeholder="—"
                                className={`field-input bg-white text-slate-500 cursor-not-allowed ${formErrors[t.id]?.age ? "border-red-500 ring-1 ring-red-500" : ""}`}
                              />
                              {formErrors[t.id]?.age && (
                                <p className="text-[10px] text-red-500 mt-1">
                                  {formErrors[t.id].age}
                                </p>
                              )}
                            </div>
                            {requiredFlags.isPANRequired && (
                              <div className="flex flex-col gap-1">
                                <label className="field-label">
                                  PAN Card{" "}
                                  {t.paxType === 1 && Number(t.age) > 18 && (
                                    <Required />
                                  )}
                                  {(t.paxType === 2 ||
                                    (t.age && Number(t.age) <= 18)) && (
                                    <span className="text-slate-500 font-normal normal-case">
                                      (Not required)
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="text"
                                  value={t.panCard || ""}
                                  disabled={
                                    isBookNowMode ||
                                    t.paxType === 2 ||
                                    (t.age && Number(t.age) <= 18)
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    setTravelers((prev) =>
                                      prev.map((tr) => {
                                        if (tr.id === t.id) {
                                          return { ...tr, panCard: val };
                                        }
                                        if (
                                          t.leadPassenger &&
                                          applyLeadPan &&
                                          tr.paxType === 1 &&
                                          !tr.leadPassenger
                                        ) {
                                          return { ...tr, panCard: val };
                                        }
                                        return tr;
                                      }),
                                    );
                                  }}
                                  placeholder="ABCDE1234F"
                                  maxLength={10}
                                  className={`field-input font-mono tracking-widest ${formErrors[t.id]?.panCard ? "border-red-500 ring-1 ring-red-500" : ""}`}
                                />
                                {formErrors[t.id]?.panCard && (
                                  <p className="text-[10px] text-red-500 mt-1">
                                    {formErrors[t.id].panCard}
                                  </p>
                                )}
                                <p className="text-[10px] text-yellow-700 font-semibold">
                                  {isCorporateBooking
                                    ? "Enter Valid Corporate PAN."
                                    : "Required only for adults older than 18."}
                                </p>
                                {t.leadPassenger &&
                                  travelers.some(
                                    (tr) =>
                                      tr.paxType === 1 && !tr.leadPassenger,
                                  ) && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id="applyLeadPan"
                                        checked={applyLeadPan}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setApplyLeadPan(checked);
                                          if (checked && t.panCard) {
                                            setTravelers((prev) =>
                                              prev.map((tr) =>
                                                tr.paxType === 1 &&
                                                !tr.leadPassenger
                                                  ? {
                                                      ...tr,
                                                      panCard: t.panCard,
                                                    }
                                                  : tr,
                                              ),
                                            );
                                          } else if (!checked) {
                                            setTravelers((prev) =>
                                              prev.map((tr) =>
                                                tr.paxType === 1 &&
                                                !tr.leadPassenger
                                                  ? { ...tr, panCard: "" }
                                                  : tr,
                                              ),
                                            );
                                          }
                                        }}
                                        className="w-4 h-4 text-[#C9A84C] focus:ring-[#C9A84C] cursor-pointer"
                                      />
                                      <label
                                        htmlFor="applyLeadPan"
                                        className="text-xs text-slate-600 font-medium cursor-pointer"
                                      >
                                        Apply this PAN card to all other adults
                                      </label>
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Passport (International only) */}
                        {isInternationalBooking &&
                          requiredFlags.isPassportRequired && (
                            <>
                              <Divider />
                              <div>
                                <SectionHeading
                                  icon={<FiBookOpen size={12} />}
                                  title="Passport Details"
                                  badge="International"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="field-label">
                                      Passport Number <Required />
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. A1234567"
                                      value={t.PassportNo || ""}
                                      onChange={(e) =>
                                        updateTraveler(
                                          t.id,
                                          "PassportNo",
                                          e.target.value,
                                        )
                                      }
                                      className={`field-input font-mono tracking-widest ${formErrors[t.id]?.PassportNo ? "border-red-500 ring-1 ring-red-500" : ""}`}
                                    />
                                    {formErrors[t.id]?.PassportNo && (
                                      <p className="text-[10px] text-red-500 mt-1">
                                        {formErrors[t.id].PassportNo}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="field-label">
                                      Issue Date <Required />
                                    </label>
                                    <input
                                      type="date"
                                      value={t.PassportIssueDate || ""}
                                      onChange={(e) =>
                                        updateTraveler(
                                          t.id,
                                          "PassportIssueDate",
                                          e.target.value,
                                        )
                                      }
                                      className={`field-input ${formErrors[t.id]?.PassportIssueDate ? "border-red-500 ring-1 ring-red-500" : ""}`}
                                    />
                                    {formErrors[t.id]?.PassportIssueDate && (
                                      <p className="text-[10px] text-red-500 mt-1">
                                        {formErrors[t.id].PassportIssueDate}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="field-label">
                                      Expiry Date <Required />
                                    </label>
                                    <input
                                      type="date"
                                      value={t.PassportExpDate || ""}
                                      onChange={(e) =>
                                        updateTraveler(
                                          t.id,
                                          "PassportExpDate",
                                          e.target.value,
                                        )
                                      }
                                      className={`field-input ${formErrors[t.id]?.PassportExpDate ? "border-red-500 ring-1 ring-red-500" : ""}`}
                                    />
                                    {formErrors[t.id]?.PassportExpDate && (
                                      <p className="text-[10px] text-red-500 mt-1">
                                        {formErrors[t.id].PassportExpDate}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                      </div>
                    </div>
                  ))}

                  <style>{`
                    .field-label {
                      font-size: 11px; font-weight: 600; color: #64748b;
                      text-transform: uppercase; letter-spacing: 0.05em;
                    }
                    .field-input {
                      height: 40px; width: 100%; padding: 0 12px;
                      font-size: 14px; color: #334155; background: white;
                      border: 1px solid #e2e8f0; border-radius: 8px;
                      outline: none; transition: border-color 0.15s, box-shadow 0.15s;
                    }
                    .field-input:focus {
                      border-color: #C9A84C;
                      box-shadow: 0 0 0 3px rgba(10,77,104,0.08);
                    }
                    .field-input:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
                    .field-input::placeholder { color: #cbd5e1; }
                  `}</style>
                </div>

                {/* Make Corporate Booking Checkbox */}
                {!isBookNowMode &&
                  validation?.CorporateBookingAllowed &&
                  validation?.CrpPANMandatory && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-2xl">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center h-5">
                          <input
                            id="corporateBooking"
                            type="checkbox"
                            checked={isCorporateBooking}
                            onChange={(e) =>
                              setIsCorporateBooking(e.target.checked)
                            }
                            className="w-4 h-4 text-[#C9A84C] bg-white border-slate-300 rounded focus:ring-[#C9A84C] focus:ring-2 cursor-pointer"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label
                            htmlFor="corporateBooking"
                            className="text-sm font-semibold text-slate-800 cursor-pointer"
                          >
                            Make Corporate Booking
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Check this box if this is a corporate booking
                            requiring special handling.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Purpose of Travel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C]">
                  <FiShield size={15} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Purpose of Travel
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Required for corporate approval
                  </p>
                </div>
              </div>
              <textarea
                onChange={(e) => setPurposeOfTravel(e.target.value)}
                placeholder="Describe the reason for this booking…"
                value={purposeOfTravel}
                className={`w-full bg-white border ${formErrors.purposeOfTravel ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"} rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/10 focus:bg-white min-h-[100px] transition resize-none`}
              />
              {formErrors.purposeOfTravel && (
                <p className="text-[11px] text-red-500 mt-2 font-medium">
                  {formErrors.purposeOfTravel}
                </p>
              )}
            </div>

            {/* GST Details */}
            {/* <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 text-green-600">
                    <FiTag size={15} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      GST Details
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Fetched automatically from your corporate profile
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-1 rounded uppercase tracking-wider">
                  Profile Locked
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  {
                    label: "GSTIN",
                    key: "gstin",
                    placeholder: "GSTIN",
                  },
                  {
                    label: "Legal Name",
                    key: "legalName",
                    placeholder: "Company legal name",
                  },
                  {
                    label: "GST Email",
                    key: "gstEmail",
                    placeholder: "GST Email",
                  },
                  {
                    label: "Billing Address",
                    key: "address",
                    placeholder: "Street, City, State, PIN",
                  },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} className={key === 'address' ? 'lg:col-span-3' : ''}>
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={gstDetails[key] || ""}
                      readOnly
                      placeholder={placeholder}
                      className="w-full px-4 py-2.5 border border-slate-100 rounded-lg text-sm bg-white text-slate-600 cursor-not-allowed font-medium"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-slate-500 italic">
                * Note: To update GST details, please contact your travel administrator.
              </p>
            </div> */}
          </div>
  );
};
