export const normalizeCurrencyText = (text) => {
  if (!text) return text;
  return text.replace(/INR\s*(\d+)(?:\/-|\.00|\b)/gi, (match, p1) => {
    return '₹' + Number(p1).toLocaleString('en-IN');
  });
};

export const parseFareRuleHtml = (html) => {
  if (!html) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const result = {
    fareHeader: { fareBasisCode: null, fareType: null },
    baggage: { checkIn: "", cabin: "", infant: "" },
    mealAndSeat: { meal: "As per airline policy", seat: "As per airline policy" },
    cancellation: [],
    reissue: [],
    notes: []
  };

  // 1. FARE HEADER
  const fbcMatch = html.match(/FareBasisCode is:\s*<\/?\w*>?\s*([A-Z0-9]+)/i);
  if (fbcMatch) result.fareHeader.fareBasisCode = fbcMatch[1];
  
  // Try finding Fare Type from any node
  const textContent = doc.body.textContent || "";
  if (textContent.includes("Xpress Value")) result.fareHeader.fareType = "Xpress Value";

  // 2. TABLES
  const rows = doc.querySelectorAll("table tbody tr");
  let currentCategory = "";

  const expandShorthand = (str, category = "") => {
    if (!str) return str;
    const lower = str.toLowerCase().trim();
    
    // Explicit exclusions mapping to full sentences
    if (lower === "not allowed" || lower === "no") {
       if (category.includes("cancel")) return "Cancellation is strictly not permitted for this fare class.";
       if (category.includes("change") || category.includes("reissue")) return "Date changes or reissuance are strictly not permitted for this fare class.";
       return "This service is currently not allowed or excluded under this fare policy.";
    }

    if (lower === "allowed" || lower === "yes") {
       if (category.includes("cancel")) return "Cancellation is permitted. Standard airline cancellation charges will apply.";
       if (category.includes("change") || category.includes("reissue")) return "Date changes are permitted. Standard airline modification charges and fare differences will apply.";
       return "This service is included and permitted under this fare policy.";
    }

    if (lower === "free" || lower === "included") {
       return "This service is provided complimentary as part of your current fare selection.";
    }

    // Expand fees that start with INR or amount
    if (lower.includes("inr") || lower.includes("rs") || lower.includes("₹")) {
       if (category.includes("cancel")) return `A cancellation fee of ${str} will be levied by the airline. Additional agency processing fees may apply.`;
       if (category.includes("change") || category.includes("reissue")) return `A date change fee of ${str} will be levied by the airline, in addition to any applicable fare difference.`;
    }

    if (lower.includes("as per airline")) {
      return "Charges will be levied strictly in accordance with the airline's standard policies at the time of modification.";
    }

    // Wrap small note fragments in a professional wrapper
    if (str.length < 25 && !category) {
       return `Please note: ${str} applies to this booking segment.`;
    }

    return str;
  };

  rows.forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll("td, th")).map(el => el.innerText?.trim().replace(/\s+/g, ' '));
    if (tds.length === 0) return;

    if (tr.querySelector("td[rowspan], th[rowspan]")) {
      currentCategory = tds[0].toLowerCase();
      tds.shift();
    } else if (tds.length === 1 && !tds[0].includes("INR") && !tds[0].toLowerCase().includes("not allowed")) {
      currentCategory = tds[0].toLowerCase();
      return;
    }

    let value = normalizeCurrencyText(tds[tds.length - 1] || "");
    const label = tds.length > 1 ? tds[tds.length - 2] : "";

    // Apply expansive logic to make texts full sentences
    value = expandShorthand(value, currentCategory);

    if (currentCategory.includes("baggage")) {
      const lowerLab = label.toLowerCase();
      if (lowerLab.includes("check") || lowerLab.includes("adult") || lowerLab.includes("child")) result.baggage.checkIn = value;
      else if (lowerLab.includes("cabin") || lowerLab.includes("hand")) result.baggage.cabin = value;
      else if (lowerLab.includes("infant")) result.baggage.infant = value;
    } else if (currentCategory.includes("meal") || currentCategory.includes("seat")) {
      const lowerLab = label.toLowerCase() || currentCategory;
      if (lowerLab.includes("meal")) result.mealAndSeat.meal = value;
      if (lowerLab.includes("seat")) result.mealAndSeat.seat = value;
    } else if (currentCategory.includes("cancel")) {
      result.cancellation.push({ timeRange: label, fee: value });
    } else if (currentCategory.includes("change") || currentCategory.includes("reissue")) {
      result.reissue.push({ timeRange: label, fee: value });
    }
  });

  // 3. Fallback for baggage if empty
  if (!result.baggage.checkIn) result.baggage.checkIn = "15 kg";
  if (!result.baggage.cabin) result.baggage.cabin = "7 kg";

  // 4. NOTES & SHORTCODES
  const lis = doc.querySelectorAll("ol li, ul li");
  lis.forEach(li => {
    let noteText = li.innerText?.trim() || "";
    noteText = normalizeCurrencyText(noteText);
    result.notes.push(expandShorthand(noteText, ""));
  });

  return result;
};

export const processFareRulesData = (rawRulesArray, quoteResults) => {
  if (!rawRulesArray || rawRulesArray.length === 0) return [];

  const miniRules = quoteResults?.MiniFareRules || (Array.isArray(quoteResults) && quoteResults[0]?.MiniFareRules) || [];
  
  return rawRulesArray.map(rule => {
    const rawHtml = rule.FareRuleDetail;
    const parsed = parseFareRuleHtml(rawHtml);
    
    if (parsed && miniRules.length > 0) {
      const cancelRules = miniRules[0] && Array.isArray(miniRules[0]) ? miniRules[0].filter(m => m.Type === "Cancellation") : miniRules.filter(m => m.Type === "Cancellation");
      const reissueRules = miniRules[0] && Array.isArray(miniRules[0]) ? miniRules[0].filter(m => m.Type === "Reissue") : miniRules.filter(m => m.Type === "Reissue");
      
      if (cancelRules.length > 0 && parsed.cancellation.length === 0) {
        parsed.cancellation = cancelRules.map(c => ({
          timeRange: `${c.From} to ${c.To} ${c.Unit}`,
          fee: normalizeCurrencyText(`INR ${c.Details}`)
        }));
      }

      if (reissueRules.length > 0 && parsed.reissue.length === 0) {
        parsed.reissue = reissueRules.map(c => ({
          timeRange: `${c.From} to ${c.To} ${c.Unit}`,
          fee: normalizeCurrencyText(`INR ${c.Details}`)
        }));
      }
    }

    if (!parsed.cancellation || parsed.cancellation.length === 0) {
        parsed.cancellation = [{ timeRange: "Standard Terms", fee: "Cancellation charges will be mapped as per the standard airline cancellation policies in effect at the time of modification." }];
    }
    if (!parsed.reissue || parsed.reissue.length === 0) {
        parsed.reissue = [{ timeRange: "Standard Terms", fee: "Date changes or reissuance of tickets are strictly subject to standard airline policies and fare differences." }];
    }

    return {
      airline: rule.Airline,
      origin: rule.Origin,
      destination: rule.Destination,
      fareBasisCode: parsed?.fareHeader?.fareBasisCode || rule.FareBasisCode,
      ...parsed,
      rawHtml // Keeping raw purely just in case, but won't be rendered.
    };
  });
};
