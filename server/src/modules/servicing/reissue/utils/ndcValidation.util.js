function validateNdcRequirements({ travellers = [], newJourney = {} }) {
  const errors = [];
  const validTitles = new Set(["MR", "MRS", "MS", "MISS", "MASTER"]);

  travellers.forEach((traveller, index) => {
    const label = `traveller[${index}]`;
    if (!traveller?.passportNumber) {
      errors.push(`${label}: passportNumber is mandatory for NDC reissue`);
    }
    if (!traveller?.email) {
      errors.push(`${label}: email is mandatory for NDC reissue`);
    }
    if (!traveller?.phoneWithCode && !traveller?.cellCountryCode) {
      errors.push(`${label}: CellCountryCode is mandatory for NDC reissue`);
    }
    if (!traveller?.nationality) {
      errors.push(`${label}: country code / nationality is mandatory for NDC reissue`);
    }
    const title = String(traveller?.title || "").trim().toUpperCase();
    if (!title || !validTitles.has(title)) {
      errors.push(`${label}: valid title is mandatory for NDC reissue`);
    }
    const fullName = `${traveller?.firstName || ""}${traveller?.lastName || ""}`;
    if (fullName.includes(".")) {
      errors.push(`${label}: names cannot contain dots for NDC reissue`);
    }
  });

  if (!newJourney?.departureDate) {
    errors.push("newJourney.departureDate is required for NDC reissue");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = { validateNdcRequirements };
