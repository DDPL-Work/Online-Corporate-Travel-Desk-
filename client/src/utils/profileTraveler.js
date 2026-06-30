export const toDateInputValue = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (trimmed.includes("T")) return trimmed.split("T")[0];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

export const calculateAgeFromDate = (value) => {
  const dob = toDateInputValue(value);
  if (!dob) return "";

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

export const getLeadTravelerProfilePatch = (sourceProfile) => {
  if (!sourceProfile) return {};

  const rawName = sourceProfile.name || sourceProfile.displayName || "";
  let firstName = "";
  let lastName = "";

  if (typeof sourceProfile.name === "object" && sourceProfile.name !== null) {
    firstName = sourceProfile.name.firstName || "";
    lastName = sourceProfile.name.lastName || "";
  } else {
    const names = (typeof rawName === "string" ? rawName : "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    firstName = names[0] || "";
    lastName = names.slice(1).join(" ");
  }

  const dob = toDateInputValue(
    sourceProfile.dob ||
      sourceProfile.dateOfBirth ||
      sourceProfile.DateOfBirth ||
      sourceProfile.birthDate,
  );

  return {
    firstName: firstName.toUpperCase(),
    lastName: lastName.toUpperCase(),
    email: sourceProfile.email || "",
    phoneWithCode:
      sourceProfile.phone ||
      sourceProfile.mobile ||
      sourceProfile.phoneWithCode ||
      "",
    dob,
    age: calculateAgeFromDate(dob),
  };
};

export const mergeLeadTravelerProfile = (traveler, sourceProfile) => {
  if (!traveler || !sourceProfile) return traveler;

  const patch = getLeadTravelerProfilePatch(sourceProfile);

  return Object.entries(patch).reduce(
    (next, [key, value]) =>
      value && !next[key] ? { ...next, [key]: value } : next,
    traveler,
  );
};
