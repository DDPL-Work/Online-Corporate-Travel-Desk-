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

  // 1. FARE HEADER & CONTEXT
  const fbcMatch = html.match(/FareBasisCode is:\s*<\/?\w*>?\s*([A-Z0-9]+)/i);
  if (fbcMatch) result.fareHeader.fareBasisCode = fbcMatch[1];

  const textContent = doc.body.textContent || "";
  if (textContent.toLowerCase().includes("non refundable")) result.fareHeader.fareType = "Non-Refundable";
  else if (textContent.includes("Xpress Value")) result.fareHeader.fareType = "Xpress Value";
  else if (textContent.includes("Corporate Flex")) result.fareHeader.fareType = "Corporate Flex";

  // 2. TABLES
  const tables = Array.from(doc.querySelectorAll("table"));
  
  const expandShorthand = (str) => {
    if (!str) return str;
    const lower = str.toLowerCase().trim();
    if (lower.includes("not allowed")) return "Not Allowed";
    if (lower === "allowed" || lower === "yes") return "Allowed";
    if (lower === "free" || lower === "included" || lower === "nil" || lower === "no charge") return "Nil";
    return str;
  };

  tables.forEach(table => {
    const headers = Array.from(table.querySelectorAll("th, td:first-child")).map(el => el.innerText.toLowerCase());
    const trs = Array.from(table.querySelectorAll("tr"));

    // A. Air India Style 6-column Penalty Table (Sector | Duration | Type | DepartureType | PenaltyDetails)
    if (headers.includes("sector") && headers.includes("penaltydetails")) {
      trs.forEach(tr => {
         const tds = Array.from(tr.querySelectorAll("td, th")).map(c => c.innerText.trim());
         if (tds.length >= 5) {
            const type = tds[2]?.toLowerCase() || "";
            const depType = tds[3] || "";
            const penalty = normalizeCurrencyText(tds[4] || "");
            const timeRange = depType ? `${depType}` : "Policy";

            if (type.includes("reissue") || type.includes("change")) {
              result.reissue.push({ timeRange, fee: expandShorthand(penalty) });
            } else if (type.includes("refund") || type.includes("cancel")) {
              result.cancellation.push({ timeRange, fee: expandShorthand(penalty) });
            }
         }
      });
      return; // Skip generic parsing for this table
    }

    // B. Complex Fee Table (Currency | Reschedule | Cancellation)
    if (headers.includes("reschedule") && headers.includes("cancellation")) {
      const subHeaders = Array.from(table.querySelectorAll("tr:nth-child(2) th")).map(th => th.innerText.trim());
      const dataRows = Array.from(table.querySelectorAll("tr")).slice(2);
      const inrRow = dataRows.find(row => row.innerText.includes("INR")) || dataRows[0];
      if (inrRow) {
        const cells = Array.from(inrRow.querySelectorAll("td")).map(td => td.innerText.trim());
        if (cells.length >= 5 && subHeaders.length >= 4) {
             result.reissue.push({ timeRange: subHeaders[0], fee: `INR ${cells[1]}` });
             result.reissue.push({ timeRange: subHeaders[1], fee: `INR ${cells[2]}` });
             result.cancellation.push({ timeRange: subHeaders[2], fee: `INR ${cells[3]}` });
             result.cancellation.push({ timeRange: subHeaders[3], fee: `INR ${cells[4]}` });
        }
      }
    }

    // C. Vertical/Nested Category Table
    rows_loop: for (let i = 0; i < trs.length; i++) {
      const tr = trs[i];
      const cells = Array.from(tr.querySelectorAll("td, th"));
      if (cells.length === 0) continue;

      let tds = cells.map(c => c.innerText.trim().replace(/\s+/g, " "));
      let currentCategory = "";

      if (cells[0].hasAttribute("rowspan")) {
        currentCategory = tds[0].toLowerCase();
        tds.shift();
      }

      const label = (tds[0] || "").toLowerCase();
      const value = expandShorthand(tds[tds.length - 1] || "");

      if (label.includes("cabin") || label.includes("hand")) result.baggage.cabin = value;
      else if (label.includes("check-in") || label.includes("adult")) result.baggage.checkIn = value;
      else if (label.includes("infant")) result.baggage.infant = value;
      else if (label.includes("meal")) result.mealAndSeat.meal = value;
      else if (label.includes("seat")) result.mealAndSeat.seat = value;
    }
  });

  // 3. FALLBACKS & NOTES
  if (!result.baggage.checkIn) result.baggage.checkIn = "15 kg";
  if (!result.baggage.cabin) result.baggage.cabin = "7 kg";

  const lists = doc.querySelectorAll("ol, ul, fieldset");
  lists.forEach(list => {
    // For fieldsets, look for bold labels as separate notes
    if (list.tagName === "FIELDSET") {
       const bolds = Array.from(list.querySelectorAll("b"));
       bolds.forEach(b => {
          const text = b.innerText.trim();
          if (text.length > 5 && text.length < 100 && !result.notes.includes(text)) {
             result.notes.push(text);
          }
       });
    }

    const items = Array.from(list.querySelectorAll("li"));
    items.forEach(li => {
      let text = li.innerText?.trim().replace(/\s+/g, " ");
      // Only keep short, meaningful bullet points. 
      // Skip long legal walls (> 160 chars) or very short fragments (< 10 chars)
      if (text && text.length > 10 && text.length < 160) {
        if (!result.notes.some(n => n.includes(text.substring(0, 20)))) {
          result.notes.push(normalizeCurrencyText(text));
        }
      }
    });
  });

  // Specialized Extraction for "Non-Refundable" text blocks
  if (textContent.toLowerCase().includes("non refundable") && result.cancellation.length === 0) {
    result.cancellation.push({ timeRange: "Policy", fee: "Not Allowed" });
  }

  // Cleanup Notes: Remove duplicates and very similar entries
  result.notes = result.notes.filter((note, index, self) => {
    return self.findIndex(n => n.toLowerCase() === note.toLowerCase()) === index;
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
