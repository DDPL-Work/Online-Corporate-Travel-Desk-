/**
 * Reissue Penalty Fallback Configuration
 *
 * Provides static reissue penalties for major airlines
 * to be used as a final fallback when all other structured
 * and parsed sources are unavailable.
 */

module.exports = {
  // Indigo
  "6E": {
    defaultDomesticPenalty: 3500,
    defaultInternationalPenalty: 5000,
  },
  // Air India Express
  "IX": {
    defaultDomesticPenalty: 3000,
    defaultInternationalPenalty: 4500,
  },
  // SpiceJet
  "SG": {
    defaultDomesticPenalty: 3000,
    defaultInternationalPenalty: 5000,
  },
  // Akasa Air
  "QP": {
    defaultDomesticPenalty: 3000,
    defaultInternationalPenalty: 4500,
  },
  // Air India
  "AI": {
    defaultDomesticPenalty: 3250,
    defaultInternationalPenalty: 6000,
  },
  // Vistara
  "UK": {
    defaultDomesticPenalty: 3500,
    defaultInternationalPenalty: 6000,
  },
  // Default fallback for any other airline
  "DEFAULT": {
    defaultDomesticPenalty: 3000,
    defaultInternationalPenalty: 5500,
  }
};
