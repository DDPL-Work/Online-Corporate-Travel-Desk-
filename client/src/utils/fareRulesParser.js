/**
 * fareRulesParser.js
 *
 * Parses TBO fare rule API responses into structured, UI-ready objects.
 * ── SAFE: pure functions, no side-effects, no network/DB calls ──
 */

// ─── Currency text normalizer ──────────────────────────────────────────────────
export const normalizeCurrencyText = (text) => {
  if (!text) return text;
  return text.replace(/([A-Z]{3})\s*(\d+)(?:\/-|\.00|\b)/gi, (_, currency, amount) =>
    `${currency.toUpperCase()} ${Number(amount).toLocaleString("en-IN")}`,
  );
};

// ─── Internal helpers ─────────────────────────────────────────────────────────
const expandShorthand = (text) => {
  if (!text) return "";
  return text
    .trim()
    .replace(/\bnil\b/gi, "No Charge")
    .replace(/\bna\b/gi, "Not Applicable");
};

/** Parse ISO 8601 duration like P31DT7H or PT0S */
const parseISODuration = (iso) => {
  if (!iso || iso === "PT0S") return "0";
  const match = iso.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!match) return iso;
  return [
    match[1] ? `${match[1]} days` : "",
    match[2] ? `${match[2]} hrs` : "",
    match[3] ? `${match[3]} mins` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

// ─── FareInclusions extractor ─────────────────────────────────────────────────
/**
 * Extracts FareInclusions from multiple possible TBO response shapes.
 *
 * Sources tried (in priority order):
 *  1. rule.FareInclusions (object: { Baggage, CabinBaggage, Meal, Seat, … })
 *  2. quoteResult.FareInclusions
 *  3. quoteResult.Segments[0][0].{ Baggage, CabinBaggage, IsRefundable }
 *  4. quoteResult.IsRefundable
 */
export const parseFareInclusions = (rule, quoteResult) => {
  // Try all known shapes
  const inclObj =
    rule?.FareInclusions ||
    quoteResult?.FareInclusions ||
    quoteResult?.Fare?.FareInclusions ||
    null;

  const firstSeg =
    quoteResult?.Segments?.[0]?.[0] ||
    quoteResult?.Segments?.[0] ||
    null;

  // Baggage
  const checkinBaggage =
    inclObj?.Baggage ||
    inclObj?.CheckinBaggage ||
    firstSeg?.Baggage ||
    quoteResult?.Fare?.Baggage?.iB ||
    null;

  const cabinBaggage =
    inclObj?.CabinBaggage ||
    firstSeg?.CabinBaggage ||
    quoteResult?.Fare?.Baggage?.cB ||
    "7 Kg";

  // Flags
  const isRefundable =
    inclObj?.Refundable === true ||
    inclObj?.IsRefundable === true ||
    quoteResult?.IsRefundable === true ||
    rule?.IsRefundable === true ||
    false;

  const isChangeable =
    inclObj?.ChangeAllowed === true ||
    inclObj?.Changeable === true ||
    false;

  // Meal — truthy object/bool from TBO
  const mealIncluded =
    inclObj?.MealIncluded === true ||
    inclObj?.Meal === true ||
    (inclObj?.Meal && typeof inclObj.Meal === "string" && inclObj.Meal !== "No Meal") ||
    false;

  // Seat
  const seatIncluded =
    inclObj?.SeatIncluded === true ||
    inclObj?.Seat === true ||
    false;

  // Lounge / Priority boarding
  const loungeAccess =
    inclObj?.LoungeAccess === true || inclObj?.Lounge === true || false;

  const priorityBoarding =
    inclObj?.PriorityBoarding === true || false;

  // Build human-readable items list for UI
  const items = [];

  if (checkinBaggage) {
    items.push({ key: "checkin", label: `Check-in: ${checkinBaggage}`, value: checkinBaggage, positive: true });
  }
  if (cabinBaggage) {
    items.push({ key: "cabin", label: `Cabin: ${cabinBaggage}`, value: cabinBaggage, positive: true });
  }
  if (mealIncluded) {
    items.push({ key: "meal", label: "Meal included", positive: true });
  }
  if (seatIncluded) {
    items.push({ key: "seat", label: "Seat selection included", positive: true });
  }
  if (loungeAccess) {
    items.push({ key: "lounge", label: "Lounge access", positive: true });
  }
  if (priorityBoarding) {
    items.push({ key: "priority", label: "Priority boarding", positive: true });
  }
  items.push({
    key: "refund",
    label: isRefundable ? "Refundable" : "Non-refundable",
    positive: isRefundable,
  });
  items.push({
    key: "change",
    label: isChangeable ? "Date change allowed" : "Date change as per policy",
    positive: isChangeable,
  });

  return {
    checkinBaggage,
    cabinBaggage,
    isRefundable,
    isChangeable,
    mealIncluded,
    seatIncluded,
    loungeAccess,
    priorityBoarding,
    items,
  };
};

// ─── HTML-aware fare rule parser ──────────────────────────────────────────────
const parseFareRuleHtml = (html) => {
  if (!html) return null;

  // Only run DOMParser in browser
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return {
      fareHeader: { fareBasisCode: null, fareType: null },
      baggage: { checkIn: "", cabin: "", infant: "" },
      mealAndSeat: { meal: "As per airline policy", seat: "As per airline policy" },
      cancellation: [],
      reissue: [],
      notes: [],
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const result = {
    fareHeader: { fareBasisCode: null, fareType: null },
    baggage: { checkIn: "", cabin: "", infant: "" },
    mealAndSeat: { meal: "As per airline policy", seat: "As per airline policy" },
    cancellation: [],
    reissue: [],
    notes: [],
  };

  // 1. Fare basis code
  const fbcMatch = html.match(/FareBasisCode is:\s*<\/?[\w]*>?\s*([A-Z0-9]+)/i);
  if (fbcMatch) result.fareHeader.fareBasisCode = fbcMatch[1];

  // 2. Tables — baggage & penalty extraction
  const tables = doc.querySelectorAll("table");
  tables.forEach((table) => {
    const trs = Array.from(table.querySelectorAll("tr"));
    for (const tr of trs) {
      const cells = Array.from(tr.querySelectorAll("td, th"));
      if (cells.length < 2) continue;
      const tds = cells.map((c) => (c.innerText || c.textContent || "").trim());
      const label = tds[0].toLowerCase();
      const value = expandShorthand(tds[tds.length - 1]);
      if (label.includes("cabin") || label.includes("hand")) result.baggage.cabin = value;
      else if (label.includes("check-in") || label.includes("adult")) result.baggage.checkIn = value;
    }
  });

  // 3. Notes from list items
  const lists = doc.querySelectorAll("ul, ol");
  lists.forEach((list) => {
    Array.from(list.querySelectorAll("li")).forEach((li) => {
      const txt = (li.innerText || li.textContent || "").trim();
      if (txt.length > 5 && txt.length < 400) result.notes.push(txt);
    });
  });

  return result;
};

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * processFareRulesData
 *
 * @param {Array}  rawRulesArray  - res.payload.Response.FareRules
 * @param {Object} quoteResult    - selectedFlight (the full TBO result object)
 * @returns {Array} Processed rule objects ready for <FareRulesRenderer>
 */
export const processFareRulesData = (rawRulesArray, quoteResult) => {
  if (!rawRulesArray || rawRulesArray.length === 0) return [];

  return rawRulesArray.map((rule) => {
    const rawHtml = rule.FareRuleDetail || "";
    const parsed = parseFareRuleHtml(rawHtml) || {
      fareHeader: { fareBasisCode: null },
      baggage: { checkIn: "", cabin: "" },
      mealAndSeat: { meal: "As per airline policy", seat: "As per airline policy" },
      cancellation: [],
      reissue: [],
      notes: [],
    };

    // ── MiniFareRules (dynamic penalty data) ──────────────────────────────
    const miniRulesSource = rule.MiniFareRules || rule.MiniFarRules;
    if (miniRulesSource) {
      const rules = miniRulesSource.Rules || [];
      const globalCurrency = miniRulesSource.Currency || "INR";

      const mapRule = (c) => {
        const p = c.PaxPenalties?.[0] || {};
        const curr = p.Currency || globalCurrency;
        const fee = p.AirlineFee || 0;
        const from = parseISODuration(c.FromDuration);
        const to = parseISODuration(c.ToDuration);
        const timeRange =
          to && to !== "0" ? `${from} to ${to}` : `${from} onwards`;
        return {
          timeRange: `${c.DepartureType || "Penalty"}: ${timeRange}`,
          fee: normalizeCurrencyText(`${curr} ${fee}`),
        };
      };

      const cancelRules = rules.filter((m) => m.Type === 0 || m.Type === "Cancellation");
      const reissueRules = rules.filter((m) => m.Type === 1 || m.Type === "Reissue");
      if (cancelRules.length > 0) parsed.cancellation = cancelRules.map(mapRule);
      if (reissueRules.length > 0) parsed.reissue = reissueRules.map(mapRule);
    }

    // ── Fallback defaults ─────────────────────────────────────────────────
    if (!parsed.cancellation?.length) {
      parsed.cancellation = [{ timeRange: "Standard Terms", fee: "Subject to airline policy" }];
    }
    if (!parsed.reissue?.length) {
      parsed.reissue = [{ timeRange: "Standard Terms", fee: "Subject to airline policy" }];
    }

    // ── FareInclusions ────────────────────────────────────────────────────
    const fareInclusions = parseFareInclusions(rule, quoteResult);

    return {
      airline: rule.Airline,
      origin: rule.Origin,
      destination: rule.Destination,
      fareBasisCode: parsed?.fareHeader?.fareBasisCode || rule.FareBasisCode || null,
      fareType: rule.FareType || parsed?.fareHeader?.fareType || null,
      ...parsed,
      fareInclusions,
      rawHtml,
    };
  });
};
