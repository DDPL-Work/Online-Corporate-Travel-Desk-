const crypto = require("crypto");

/**
 * Generates a deterministic SHA256 hash for a search payload.
 * Ensures the keys are sorted before stringifying to guarantee identical payloads
 * produce the identical hash regardless of object key ordering.
 */
function generateSearchKey(payload) {
  const normalized = {
    cityCode: payload.CityCode,
    checkIn: payload.CheckIn,
    checkOut: payload.CheckOut,
    nationality: payload.GuestNationality || "IN",
    rooms: payload.NoOfRooms,
    paxRooms: payload.PaxRooms ? payload.PaxRooms.map(r => ({
      adults: r.Adults,
      children: r.Children,
      childAges: r.ChildrenAges ? [...r.ChildrenAges].sort() : []
    })) : [],
    corporateId: payload.corporateId || "",
    filters: payload.Filters || {},
  };

  // We stringify the sorted object to ensure identical structures produce identical strings
  const jsonString = JSON.stringify(normalized, Object.keys(normalized).sort());
  return crypto.createHash("sha256").update(jsonString).digest("hex");
}

module.exports = {
  generateSearchKey
};
