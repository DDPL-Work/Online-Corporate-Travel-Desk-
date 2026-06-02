const DEFAULT_MIN_DOB = "1900-01-01";

const TYPE_RULES = {
  ADT: { minAge: 12, maxAge: null, label: "Adult" },
  ADULT: { minAge: 12, maxAge: null, label: "Adult" },
  CHD: { minAge: 2, maxAge: 11, label: "Child" },
  CHILD: { minAge: 2, maxAge: 11, label: "Child" },
  INF: { minAge: 0, maxAge: 1, label: "Infant" },
  INFANT: { minAge: 0, maxAge: 1, label: "Infant" },
};

const pad = (value) => String(value).padStart(2, "0");

const normalizeDateOnly = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.split("T")[0];
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return "";
};

const parseDateOnly = (value) => {
  const normalized = normalizeDateOnly(value);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }
  return date;
};

const toDateOnly = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addYears = (date, years) =>
  new Date(date.getFullYear() + years, date.getMonth(), date.getDate());

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDisplayDate = (value) => {
  const date = parseDateOnly(value);
  if (!date) return "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const normalizePassengerType = (passengerType) => {
  if (passengerType === 1) return "ADT";
  if (passengerType === 2) return "CHD";
  if (passengerType === 3) return "INF";

  const type = String(passengerType || "ADT").toUpperCase();
  if (type === "ADULT") return "ADT";
  if (type === "CHILD") return "CHD";
  if (type === "INFANT") return "INF";
  return TYPE_RULES[type] ? type : "ADT";
};

export const getAgeOnTravelDate = (dob, travelDate) => {
  const birth = parseDateOnly(dob);
  const travel = parseDateOnly(travelDate);
  if (!birth || !travel) return null;

  let age = travel.getFullYear() - birth.getFullYear();
  const monthDiff = travel.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && travel.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
};

export const calculateDobRange = ({
  passengerType = "ADT",
  expectedAge,
  travelDate,
  minDob = DEFAULT_MIN_DOB,
  rules = {},
} = {}) => {
  const travel = parseDateOnly(travelDate);
  if (!travel) return null;

  const type = normalizePassengerType(passengerType);
  const baseRule = TYPE_RULES[type] || TYPE_RULES.ADT;
  const rule = { ...baseRule, ...(rules[type] || {}), ...rules };
  const exactAge =
    expectedAge !== undefined && expectedAge !== null && expectedAge !== ""
      ? Number(expectedAge)
      : null;

  let minDate;
  let maxDate;

  if (Number.isFinite(exactAge)) {
    minDate = addDays(addYears(travel, -(exactAge + 1)), 1);
    maxDate = addYears(travel, -exactAge);
  } else {
    minDate =
      rule.maxAge === null || rule.maxAge === undefined
        ? parseDateOnly(minDob)
        : addDays(addYears(travel, -(Number(rule.maxAge) + 1)), 1);
    maxDate = addYears(travel, -Number(rule.minAge || 0));
  }

  const minDateStr = toDateOnly(minDate);
  const maxDateStr = toDateOnly(maxDate);

  return {
    minDate: minDateStr,
    maxDate: maxDateStr,
    displayMinDate: formatDisplayDate(minDateStr),
    displayMaxDate: formatDisplayDate(maxDateStr),
    helperText: `Valid DOB range: ${formatDisplayDate(minDateStr)} - ${formatDisplayDate(maxDateStr)}`,
    passengerType: type,
    expectedAge: Number.isFinite(exactAge) ? exactAge : undefined,
  };
};

export const validatePassengerDob = ({
  dob,
  passengerType = "ADT",
  expectedAge,
  travelDate,
  required = false,
  rules,
} = {}) => {
  if (!dob) {
    return {
      valid: !required,
      error: required ? "Date of Birth is required" : "",
      range: calculateDobRange({ passengerType, expectedAge, travelDate, rules }),
    };
  }

  const normalizedDob = normalizeDateOnly(dob);
  const birth = parseDateOnly(normalizedDob);
  const range = calculateDobRange({
    passengerType,
    expectedAge,
    travelDate,
    rules,
  });

  if (!birth || !range) {
    return { valid: false, error: "Invalid Date of Birth", range };
  }

  if (normalizedDob < range.minDate || normalizedDob > range.maxDate) {
    const age = getAgeOnTravelDate(normalizedDob, travelDate);
    const ageText = age === null ? "" : ` (${age} yrs on travel date)`;
    return {
      valid: false,
      error: `${range.helperText}${ageText}`,
      range,
    };
  }

  const age = getAgeOnTravelDate(normalizedDob, travelDate);
  if (
    expectedAge !== undefined &&
    expectedAge !== null &&
    expectedAge !== "" &&
    Number(age) !== Number(expectedAge)
  ) {
    return {
      valid: false,
      error: `Age from DOB (${age} yrs) does not match searched age (${expectedAge} yrs).`,
      range,
    };
  }

  return { valid: true, error: "", range, age };
};

export const formatDobRange = (range) =>
  range ? `Valid DOB range: ${range.displayMinDate} - ${range.displayMaxDate}` : "";
