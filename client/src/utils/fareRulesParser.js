export const normalizeCurrencyText = (text) => {
  if (!text) return text;
  return text.replace(/INR\s*(\d+)(?:\/-|\.00|\b)/gi, (match, p1) => {
    return "₹" + Number(p1).toLocaleString("en-IN");
  });
};

const parseISODuration = (isoString) => {
  if (!isoString) return "";
  const match = isoString.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!match) return isoString;
  const days = match[1] ? parseInt(match[1]) : 0;
  const hours = match[2] ? parseInt(match[2]) : 0;
  const minutes = match[3] ? parseInt(match[3]) : 0;

  const parts = [];
  if (days) parts.push(`${days} Day${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} Hour${hours > 1 ? "s" : ""}`);
  if (minutes) parts.push(`${minutes} Minute${minutes > 1 ? "s" : ""}`);

  return parts.join(" ");
};

export const parseFareRuleHtml = (html) => {
  if (!html) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const result = {
    fareHeader: { fareBasisCode: null, fareType: null },
    baggage: { checkIn: "", cabin: "", infant: "" },
    mealAndSeat: {
      meal: "As per airline policy",
      seat: "As per airline policy",
    },
    cancellation: [],
    reissue: [],
    notes: [],
  };

  // 1. FARE HEADER
  const fbcMatch = html.match(/FareBasisCode is:\s*<\/?\w*>?\s*([A-Z0-9]+)/i);
  if (fbcMatch) result.fareHeader.fareBasisCode = fbcMatch[1];

  // Try finding Fare Type from any node
  const textContent = doc.body.textContent || "";
  const fareTypeMatch = textContent.match(/It is\s+([^,.<]+?)\s+Fare/i);
  if (fareTypeMatch) {
    result.fareHeader.fareType = fareTypeMatch[1].trim();
  } else if (textContent.includes("Xpress Value")) {
    result.fareHeader.fareType = "Xpress Value";
  }

  // 2. TABLES
  const rows = doc.querySelectorAll("table tbody tr");
  let currentCategory = "";

  const expandShorthand = (str, category = "") => {
    if (!str) return str;
    const lower = str.toLowerCase().trim();

    // Explicit exclusions mapping to full sentences
    if (lower === "not allowed" || lower === "no") {
      if (category.includes("cancel")) return "You cannot cancel this flight.";
      if (category.includes("change") || category.includes("reissue"))
        return "You cannot change the date for this flight.";
      return "This is not allowed for this ticket.";
    }

    if (lower === "allowed" || lower === "yes") {
      if (category.includes("cancel"))
        return "You can cancel this flight. The airline will charge a fee.";
      if (category.includes("change") || category.includes("reissue"))
        return "You can change your flight date. You will have to pay a fee and any price difference.";
      return "This is allowed for this ticket.";
    }

    if (lower === "free" || lower === "included") {
      return "This is free of charge.";
    }

    // Expand fees that start with INR or amount
    if (lower.includes("inr") || lower.includes("rs") || lower.includes("₹")) {
      if (category.includes("cancel"))
        return `The airline charges ${str} for cancellation.`;
      if (category.includes("change") || category.includes("reissue"))
        return `The airline charges ${str} to change the date.`;
    }

    if (lower.includes("as per airline")) {
      return "Fees depend on the airline's policy at the time of the change.";
    }

    // Wrap small note fragments in a professional wrapper
    if (str.length < 25 && !category) {
      return `Note: ${str}`;
    }

    return str;
  };

  rows.forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll("td, th")).map((el) =>
      el.innerText?.trim().replace(/\s+/g, " "),
    );
    if (tds.length === 0) return;

    if (tr.querySelector("td[rowspan], th[rowspan]")) {
      currentCategory = tds[0].toLowerCase();
      tds.shift();
    } else if (
      tds.length === 1 &&
      !tds[0].includes("INR") &&
      !tds[0].toLowerCase().includes("not allowed")
    ) {
      currentCategory = tds[0].toLowerCase();
      return;
    }

    let value = normalizeCurrencyText(tds[tds.length - 1] || "");
    const label = tds.length > 1 ? tds[tds.length - 2] : "";

    // Apply expansive logic to make texts full sentences
    value = expandShorthand(value, currentCategory);

    if (currentCategory.includes("baggage")) {
      const lowerLab = label.toLowerCase();
      if (
        lowerLab.includes("check") ||
        lowerLab.includes("adult") ||
        lowerLab.includes("child")
      )
        result.baggage.checkIn = value;
      else if (lowerLab.includes("cabin") || lowerLab.includes("hand"))
        result.baggage.cabin = value;
      else if (lowerLab.includes("infant")) result.baggage.infant = value;
    } else if (
      currentCategory.includes("meal") ||
      currentCategory.includes("seat")
    ) {
      const lowerLab = label.toLowerCase() || currentCategory;
      if (lowerLab.includes("meal")) result.mealAndSeat.meal = value;
      if (lowerLab.includes("seat")) result.mealAndSeat.seat = value;
    } else if (currentCategory.includes("cancel")) {
      result.cancellation.push({ timeRange: label, fee: value });
    } else if (
      currentCategory.includes("change") ||
      currentCategory.includes("reissue")
    ) {
      result.reissue.push({ timeRange: label, fee: value });
    }
  });

  // 3. Fallback for baggage if empty
  if (!result.baggage.checkIn) result.baggage.checkIn = "15 kg";
  if (!result.baggage.cabin) result.baggage.cabin = "7 kg";

  // 4. NOTES & SHORTCODES
  const lis = doc.querySelectorAll("ol li, ul li");
  lis.forEach((li) => {
    let noteText = li.innerText?.trim() || "";
    noteText = normalizeCurrencyText(noteText);
    result.notes.push(expandShorthand(noteText, ""));
  });

  return result;
};

export const processFareRulesData = (rawRulesArray, quoteResults) => {
  if (!rawRulesArray || rawRulesArray.length === 0) return [];

  const miniRules =
    quoteResults?.MiniFareRules ||
    (Array.isArray(quoteResults) && quoteResults[0]?.MiniFareRules) ||
    [];

  return rawRulesArray.map((rule) => {
    const rawHtml = rule.FareRuleDetail;
    const parsed = parseFareRuleHtml(rawHtml);

    // ✅ Production API Support: MiniFarRules inside the rule object
    const prodMiniRules = rule.MiniFarRules?.Rules || [];

    if (parsed) {
      // 1. Process Production MiniFarRules if present
      if (prodMiniRules.length > 0) {
        const cancelRules = prodMiniRules.filter((m) => m.Type === 0);
        const reissueRules = prodMiniRules.filter((m) => m.Type === 1);

        if (cancelRules.length > 0) {
          parsed.cancellation = cancelRules.map((c) => ({
            timeRange: `${parseISODuration(c.FromDuration)}${c.ToDuration ? " to " + parseISODuration(c.ToDuration) : " onwards"}`,
            fee: normalizeCurrencyText(`INR ${c.PaxPenalties?.[0]?.AirlineFee || 0}`),
          }));
        }

        if (reissueRules.length > 0) {
          parsed.reissue = reissueRules.map((c) => ({
            timeRange: `${parseISODuration(c.FromDuration)}${c.ToDuration ? " to " + parseISODuration(c.ToDuration) : " onwards"}`,
            fee: normalizeCurrencyText(`INR ${c.PaxPenalties?.[0]?.AirlineFee || 0}`),
          }));
        }
      }

      // 2. Process Legacy MiniFareRules from quoteResults if parsed rules still empty
      else if (miniRules.length > 0) {
        const cancelRules =
          miniRules[0] && Array.isArray(miniRules[0])
            ? miniRules[0].filter((m) => m.Type === "Cancellation")
            : miniRules.filter((m) => m.Type === "Cancellation");
        const reissueRules =
          miniRules[0] && Array.isArray(miniRules[0])
            ? miniRules[0].filter((m) => m.Type === "Reissue")
            : miniRules.filter((m) => m.Type === "Reissue");

        if (cancelRules.length > 0 && parsed.cancellation.length === 0) {
          parsed.cancellation = cancelRules.map((c) => ({
            timeRange: `${c.From} to ${c.To} ${c.Unit}`,
            fee: normalizeCurrencyText(`INR ${c.Details}`),
          }));
        }

        if (reissueRules.length > 0 && parsed.reissue.length === 0) {
          parsed.reissue = reissueRules.map((c) => ({
            timeRange: `${c.From} to ${c.To} ${c.Unit}`,
            fee: normalizeCurrencyText(`INR ${c.Details}`),
          }));
        }
      }
    }

    if (!parsed.cancellation || parsed.cancellation.length === 0) {
      parsed.cancellation = [
        {
          timeRange: "Standard Terms",
          fee: "Fees will be charged according to the airline's rules at the time of cancellation.",
        },
      ];
    }
    if (!parsed.reissue || parsed.reissue.length === 0) {
      parsed.reissue = [
        {
          timeRange: "Standard Terms",
          fee: "Fees and price differences will be charged according to the airline's rules at the time of the date change.",
        },
      ];
    }

    return {
      airline: rule.Airline,
      origin: rule.Origin,
      destination: rule.Destination,
      fareBasisCode: parsed?.fareHeader?.fareBasisCode || rule.FareBasisCode,
      ...parsed,
      rawHtml, // Keeping raw purely just in case, but won't be rendered.
    };
  });
};
